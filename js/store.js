/* GO FRIENDS — shared data store (orders + reminders).
   Uses the local server API when available, falls back to localStorage. */
window.GFStore = (function () {
  "use strict";

  var LS = "gofriends_orders";
  var RS = "gofriends_reminders";
  var apiDown = false;

  /* ---------- small helpers ---------- */
  function lsGet(key, fallback) {
    try {
      var d = JSON.parse(localStorage.getItem(key));
      if (d) return d;
    } catch (e) {}
    return fallback;
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function normPhone(p) {
    return String(p || "").replace(/[^0-9]/g, "").slice(0, 15);
  }
  function apiUrl(path) {
    return "/api/" + path;
  }
  function fetchJSON(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : null
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  /* ---------- public: orders ---------- */
  function createOrder(data) {
    if (apiDown) { return Promise.resolve(makeLocal(data)); }
    return fetchJSON("POST", apiUrl("order"), data).then(function (o) {
      synclocal(o);
      return o;
    }).catch(function () {
      apiDown = true;
      var o = makeLocal(data);
      synclocal(o);
      return o;
    });
  }

  function makeLocal(data) {
    return {
      id: "GF-" + Date.now().toString(36).toUpperCase().slice(-5) + String(Math.floor(Math.random() * 900) + 100),
      name: String(data.name || ""),
      phone: normPhone(data.phone),
      type: String(data.type || "Other"),
      design: String(data.design || ""),
      measurements: String(data.measurements || ""),
      needBy: String(data.needBy || ""),
      notes: String(data.notes || ""),
      price: data.price ? Number(data.price) : 0,
      status: "Received",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      local: true
    };
  }

  function synclocal(o) {
    var list = lsGet(LS, []);
    list = list.filter(function (x) { return x.id !== o.id; });
    list.unshift(o);
    lsSet(LS, list);
  }

  function loadAll() {
    if (apiDown) { return Promise.resolve(lsGet(LS, [])); }
    return fetchJSON("GET", apiUrl("orders")).then(function (list) {
      var rows = list && list.length ? list : [];
      var seen = {};
      rows.forEach(function (o) { seen[o.id] = 1; });
      lsGet(LS, []).forEach(function (lo) { if (!seen[lo.id]) rows.push(lo); });
      rows.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      return rows;
    }).catch(function () {
      apiDown = true;
      return lsGet(LS, []);
    });
  }

  function byPhone(phone) {
    return loadAll().then(function (list) {
      var ph = normPhone(phone);
      return list.filter(function (o) { return o.phone === ph; });
    });
  }

  function updateOrder(id, patch) {
    if (!apiDown) {
      return fetchJSON("PUT", apiUrl("order/" + id), patch).then(function (o) {
        synclocal(o);
        return o;
      }).catch(function () {
        apiDown = true;
        return patchLocal(id, patch);
      });
    }
    return Promise.resolve(patchLocal(id, patch));
  }

  function patchLocal(id, patch) {
    var list = lsGet(LS, []);
    var found = null;
    list.forEach(function (o) { if (o.id === id) found = o; });
    if (!found) return null;
    if (patch.status) found.status = patch.status;
    if (typeof patch.price === "number") found.price = patch.price;
    if (patch.needBy) found.needBy = patch.needBy;
    found.updatedAt = Date.now();
    lsSet(LS, list);
    return found;
  }

  function removeOrder(id) {
    if (apiDown) { removeLocal(id); return Promise.resolve(); }
    return fetchJSON("DELETE", apiUrl("order/" + id)).then(function () {
      removeLocal(id);
    }).catch(function () {
      apiDown = true;
      removeLocal(id);
    });
  }
  function removeLocal(id) {
    lsSet(LS, lsGet(LS, []).filter(function (o) { return o.id !== id; }));
  }

  /* ---------- stats ---------- */
  function getStats() {
    if (apiDown) {
      var list = lsGet(LS, []);
      return Promise.resolve(localStats(list));
    }
    return fetchJSON("GET", apiUrl("stats")).catch(function () {
      apiDown = true;
      return localStats(lsGet(LS, []));
    });
  }
  function localStats(list) {
    var byStatus = {}, byType = {}, byMonth = {};
    var now = new Date();
    var ms = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    var pending = 0, ready = 0, thisMonth = 0;
    list.forEach(function (o) {
      var st = o.status || "Received";
      byStatus[st] = (byStatus[st] || 0) + 1;
      var ty = o.type || "Other";
      byType[ty] = (byType[ty] || 0) + 1;
      var d = new Date(o.createdAt || Date.now());
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      byMonth[key] = (byMonth[key] || 0) + 1;
      if (st === "Received" || st === "In Progress") pending++;
      if (st === "Ready") ready++;
      if ((o.createdAt || 0) >= ms) thisMonth++;
    });
    var series = [];
    for (var i = 5; i >= 0; i--) {
      var dd = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var k = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0");
      series.push({ key: k, label: dd.toLocaleString("en", { month: "short" }), count: byMonth[k] || 0 });
    }
    return { total: list.length, pending: pending, ready: ready, delivered: byStatus.Delivered || 0, thisMonth: thisMonth, byStatus: byStatus, byType: byType, byMonth: series };
  }

  /* ---------- reminders ---------- */
  function reminders() { return lsGet(RS, []); }
  function addReminder(r) {
    var list = lsGet(RS, []);
    list.push({ id: Date.now().toString(36), phone: normPhone(r.phone), date: r.date, time: r.time || "10:00 AM", note: r.note || "", createdAt: Date.now() });
    lsSet(RS, list);
  }
  function removeReminder(id) { lsSet(RS, lsGet(RS, []).filter(function (r) { return r.id !== id; })); }
  function dueReminders() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return lsGet(RS, []).filter(function (r) {
      if (!r.date) return false;
      var d = new Date(r.date); d.setHours(0, 0, 0, 0);
      return d.getTime() <= today.getTime();
    });
  }

  return {
    createOrder: createOrder,
    loadAll: loadAll,
    byPhone: byPhone,
    updateOrder: updateOrder,
    removeOrder: removeOrder,
    getStats: getStats,
    reminders: reminders,
    addReminder: addReminder,
    removeReminder: removeReminder,
    dueReminders: dueReminders,
    normPhone: normPhone
  };
})();