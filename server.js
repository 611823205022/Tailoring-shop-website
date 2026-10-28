var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");

var types = {".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".jpg":"image/jpeg",".png":"image/png",".json":"application/json",".xml":"application/xml",".txt":"text/plain",".mp4":"video/mp4",".webm":"video/webm"};

var ordersFile = path.join(__dirname, "orders.json");
var orders = loadOrders();

function loadOrders() {
  try { return JSON.parse(fs.readFileSync(ordersFile, "utf8")) || []; }
  catch (e) { return []; }
}
function saveOrders() {
  try { fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2)); }
  catch (e) {}
}

function lanIP() {
  var ifaces = os.networkInterfaces();
  var keys = Object.keys(ifaces);
  for (var i = 0; i < keys.length; i++) {
    var list = ifaces[keys[i]];
    for (var j = 0; j < list.length; j++) {
      var a = list[j];
      if (a.family === "IPv4" && !a.internal && a.address.indexOf("169.254") !== 0) {
        return a.address;
      }
    }
  }
  return "127.0.0.1";
}

function parseQuery(str) {
  var out = {};
  str.split("&").forEach(function (p) {
    if (!p) return;
    var i = p.indexOf("=");
    var k = i >= 0 ? p.slice(0, i) : p;
    var v = i >= 0 ? decodeURIComponent(p.slice(i + 1)) : "";
    out[k] = v;
  });
  return out;
}

function orderId() {
  return "GF-" + Date.now().toString(36).toUpperCase().slice(-5) +
         String(Math.floor(Math.random() * 900) + 100);
}

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  var body = "";
  req.on("data", function (c) { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", function () {
    try { cb(JSON.parse(body || "{}")); }
    catch (e) { cb(null); }
  });
}

function statusCount() {
  var s = {};
  orders.forEach(function (o) { var k = o.status || "Received"; s[k] = (s[k] || 0) + 1; });
  return s;
}
function typeCount() {
  var t = {};
  orders.forEach(function (o) { var k = o.type || "Other"; t[k] = (t[k] || 0) + 1; });
  return t;
}
function monthSeries() {
  var out = [];
  var now = new Date();
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    var label = d.toLocaleString("en", { month: "short" });
    out.push({ key: key, label: label, count: 0 });
  }
  orders.forEach(function (o) {
    var d = new Date(o.createdAt || Date.now());
    var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    for (var j = 0; j < out.length; j++) if (out[j].key === key) out[j].count++;
  });
  return out;
}

function stats() {
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  var pending = 0, ready = 0, thisMonth = 0;
  orders.forEach(function (o) {
    var st = o.status || "Received";
    if (st === "Received" || st === "In Progress") pending++;
    if (st === "Ready") ready++;
    if ((o.createdAt || 0) >= monthStart) thisMonth++;
  });
  return {
    total: orders.length,
    pending: pending,
    ready: ready,
    delivered: (statusCount().Delivered || 0),
    thisMonth: thisMonth,
    byStatus: statusCount(),
    byType: typeCount(),
    byMonth: monthSeries()
  };
}

http.createServer(function (req, res) {
  if (req.url === "/lanip" || req.url === "/lanip/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ip: lanIP(), port: 8081 }));
    return;
  }

  var base = req.url.split("?")[0];
  var qs = req.url.indexOf("?") >= 0 ? req.url.slice(req.url.indexOf("?") + 1) : "";
  var pathParts = base.split("/").filter(function (p) { return p; });

  /* ---- Orders API ---- */
  if (pathParts[0] === "api" && pathParts[1] === "order") {
    var oid = pathParts[2];
    if (req.method === "POST" && !oid) {
      readBody(req, function (b) {
        if (!b || !b.phone) { sendJson(res, 400, { error: "phone required" }); return; }
        var order = {
          id: orderId(),
          name: String(b.name || "").slice(0, 120),
          phone: String(b.phone || "").replace(/[^0-9]/g, "").slice(0, 15),
          type: String(b.type || "Other").slice(0, 60),
          design: String(b.design || "").slice(0, 120),
          measurements: String(b.measurements || "").slice(0, 500),
          needBy: String(b.needBy || "").slice(0, 12),
          notes: String(b.notes || "").slice(0, 500),
          price: b.price ? Number(b.price) : 0,
          status: "Received",
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        orders.push(order);
        saveOrders();
        sendJson(res, 200, order);
      });
      return;
    }
    if (req.method === "PUT" && oid) {
      readBody(req, function (b) {
        if (!b) { sendJson(res, 400, { error: "bad json" }); return; }
        var o = null;
        for (var i = 0; i < orders.length; i++) if (orders[i].id === oid) { o = orders[i]; break; }
        if (!o) { sendJson(res, 404, { error: "not found" }); return; }
        if (b.status) o.status = String(b.status).slice(0, 30);
        if (typeof b.price === "number") o.price = b.price;
        if (b.needBy) o.needBy = String(b.needBy).slice(0, 12);
        o.updatedAt = Date.now();
        saveOrders();
        sendJson(res, 200, o);
      });
      return;
    }
    if (req.method === "DELETE" && oid) {
      orders = orders.filter(function (o2) { return o2.id !== oid; });
      saveOrders();
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  if (pathParts[0] === "api" && pathParts[1] === "orders" && req.method === "GET") {
    var q = parseQuery(qs);
    var list = orders.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    if (q.phone) {
      var ph = q.phone.replace(/[^0-9]/g, "");
      list = list.filter(function (o) { return o.phone === ph; });
    }
    sendJson(res, 200, list);
    return;
  }

  if (pathParts[0] === "api" && pathParts[1] === "stats" && req.method === "GET") {
    sendJson(res, 200, stats());
    return;
  }

  /* ---- Static files ---- */
  var file = base === "/" ? "index.html" : decodeURIComponent(base);
  var fp = path.join(__dirname, file);
  fs.readFile(fp, function (err, data) {
    if (err || !data) { res.writeHead(404); res.end("Not found"); return; }
    var ext = path.extname(fp);
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}).listen(8081, function () {
  console.log("Open this in your browser:        http://localhost:8081");
  console.log("For Android/iPhone on same Wi-Fi: http://" + lanIP() + ":8081");
  console.log("Orders saved to:                  " + ordersFile);
});