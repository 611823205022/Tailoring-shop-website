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
/* GO FRIENDS — price list */
(function () {
  "use strict";

  var RATES = [
    { item: "Women's Blouse (plain)", price: "₹300 onwards", note: "based on design" },
    { item: "Blouse with zari border / yoke", price: "₹350 – ₹450", note: "" },
    { item: "Maggam / hand embroidery blouse", price: "₹600 onwards", note: "design + material" },
    { item: "Bridal / designer blouse", price: "₹800 onwards", note: "stones, patta, cutwork" },
    { item: "Pattu pavadai (girls)", price: "₹900 – ₹1200", note: "kattam + zari" },
    { item: "Girls' dress / frock", price: "₹400 onwards", note: "" },
    { item: "School uniform dress", price: "₹350", note: "" },
    { item: "School skirt", price: "₹250", note: "" },
    { item: "Saree fall & side stitching", price: "₹150 onwards", note: "" },
    { item: "Petticoat stitching", price: "₹200", note: "" }
  ];

  var PRICE_LABELS = {
    gb: { item: "Item", price: "Approx. price", note: "Note" },
    ta: { item: "வேலை", price: "தோராயமான விலை", note: "குறிப்பு" }
  };

  function render() {
    var wrap = document.getElementById("priceList");
    if (!wrap) return;
    wrap.innerHTML = "";
    var lang = (document.documentElement.lang || "en") === "ta" ? "ta" : "gb";
    var L = PRICE_LABELS[lang];

    var table = document.createElement("table");
    table.className = "price-table";

    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    var th1 = document.createElement("th"); th1.textContent = L.item;
    var th2 = document.createElement("th"); th2.textContent = L.price;
    var th3 = document.createElement("th"); th3.textContent = L.note;
    trh.appendChild(th1); trh.appendChild(th2); trh.appendChild(th3);
    thead.appendChild(trh);

    var tbody = document.createElement("tbody");
    RATES.forEach(function (r) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td"); td1.textContent = r.item;
      var td2 = document.createElement("td"); td2.className = "price-cell"; td2.textContent = r.price;
      var td3 = document.createElement("td"); td3.className = "price-note"; td3.textContent = r.note;
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  /* re-render when language changes */
  window.addEventListener("gf:lang", render);
})();
/* GO FRIENDS — festive offer countdown */
(function () {
  "use strict";

  /* Approximate dates — owner can update. Pongal always falls on Jan 14. */
  var FESTIVALS = [
    { name: "Pongal Special", month: 0, day: 14 },
    { name: "Deepavali", month: 10, day: 8 },
    { name: "Pongal Special", month: 0, day: 14 }
  ];

  function nextFestival(now) {
    var best = null;
    for (var y = now.getFullYear(); y <= now.getFullYear() + 2; y++) {
      for (var i = 0; i < FESTIVALS.length; i++) {
        var d = new Date(y, FESTIVALS[i].month, FESTIVALS[i].day, 0, 0, 0, 0);
        /* Pongal always falls on Jan 14 */
        if (FESTIVALS[i].name === "Pongal Special") d = new Date(y, 0, 14);
        if (d.getTime() > now.getTime()) {
          if (!best || d.getTime() < best.date.getTime()) {
            best = { name: FESTIVALS[i].name, date: d };
          }
        }
      }
    }
    return best || { name: "Pongal Special", date: new Date(now.getFullYear() + 1, 0, 14) };
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function tick() {
    var box = document.getElementById("countdown");
    if (!box) return;
    var now = new Date();
    var f = nextFestival(now);
    var diff = Math.max(0, f.date.getTime() - now.getTime());
    var days = Math.floor(diff / 86400000);
    var hrs = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);

    var name = document.getElementById("countdownName");
    if (name) name.textContent = f.name === "Pongal Special" ? "Pongal Special" : "Deepavali";
    setCell("cdDays", days); setCell("cdHrs", hrs); setCell("cdMins", mins); setCell("cdSecs", secs);
  }
  function setCell(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = pad(v);
  }

  tick();
  setInterval(tick, 1000);
})();
/* GO FRIENDS — tips (mini blog) */
(function () {
  "use strict";

  var TIPS = [
    { icon: "✂", title: "How to Take Correct Measurements", text: "Measure bust, waist, hip and length while wearing the saree you plan to stitch with — and tell us if you prefer a tight or loose fit." },
    { icon: "🌸", title: "Blouse Style for Your Saree", text: "Heavy zari saree → simple kattam blouse. Soft kanjivaram → maggam or patta work blouse. Let the saree shine, not the blouse." },
    { icon: "🧵", title: "Silk Fabric Care", text: "Dry clean silk blouses, store them wrapped in cotton cloth, and press on the reverse side — never spray water directly on zari." },
    { icon: "🎒", title: "Order School Uniforms Early", text: "June rush fills our seats fast. Bring your school fabric at least 10 days ahead for neat, strong seams that last the whole school year." },
    { icon: "💎", title: "Which Embroidery Work", text: "Maggam for hand-worked elegance, mirror work for village festivals, stones for weddings. Tell us your occasion and budget." },
    { icon: "🪡", title: "Trial Fitting Advice", text: "We do a trial for every blouse. Bring the exact petticoat / skirt you will wear — it helps us set the perfect length." }
  ];

  function renderTips() {
    var grid = document.getElementById("tipsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    TIPS.forEach(function (t) {
      var art = document.createElement("article");
      art.className = "tip-card";
      var ic = document.createElement("div");
      ic.className = "tip-icon";
      ic.textContent = t.icon;
      var h = document.createElement("h3");
      h.textContent = t.title;
      var p = document.createElement("p");
      p.textContent = t.text;
      art.appendChild(ic); art.appendChild(h); art.appendChild(p);
      grid.appendChild(art);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderTips);
  } else {
    renderTips();
  }
})();
/* GO FRIENDS — photo lightbox */
(function () {
  "use strict";

  var modal, img, title, sub, waBtn, closeBtn;
  var PHONE = "9751590453";

  function ensure() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "lightbox";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;

    var box = document.createElement("div");
    box.className = "lightbox-box";
    img = document.createElement("img");
    img.className = "lightbox-img";
    img.alt = "";

    title = document.createElement("h3");
    title.className = "lightbox-title";
    sub = document.createElement("p");
    sub.className = "lightbox-sub";

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close");

    waBtn = document.createElement("a");
    waBtn.target = "_blank";
    waBtn.rel = "noopener";
    waBtn.className = "btn btn-gold lightbox-wa";
    waBtn.textContent = "Order this on WhatsApp";

    var head = document.createElement("div");
    head.className = "lightbox-head";
    head.appendChild(title);
    head.appendChild(closeBtn);
    box.appendChild(head);
    box.appendChild(img);
    box.appendChild(sub);
    box.appendChild(waBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  function open(src, name, note) {
    ensure();
    img.src = src;
    img.alt = name || "Blouse design";
    title.textContent = name || "Design";
    sub.textContent = note || "";
    var q = "Hello GO FRIENDS, I like this design and want to order it.";
    if (name) q += " (" + name + ")";
    waBtn.href = "https://wa.me/91" + PHONE + "?text=" + encodeURIComponent(q);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  window.GFLightbox = { open: open, close: close };
})();
/* GO FRIENDS — reviews carousel */
(function () {
  "use strict";

  var timers = [];
  var rootCache = [];

  function cardsPerView() {
    if (window.innerWidth >= 900) return 3;
    if (window.innerWidth >= 600) return 2;
    return 1;
  }

  function initOne(root) {
    root.querySelectorAll(".carousel-track").forEach(function () {});
    var track = root.querySelector(".carousel-track");
    var prev = root.querySelector(".carousel-arrow.prev");
    var next = root.querySelector(".carousel-arrow.next");
    var dotsWrap = root.querySelector(".carousel-dots");
    if (!track) return;

    var items = Array.prototype.slice.call(track.children);
    if (!items.length) { if (dotsWrap) dotsWrap.innerHTML = ""; return; }

    var o = { idx: 0, timer: null };
    rootCache.push({ root: root, o: o });

    function refresh() {
      var n = cardsPerView();
      var maxIdx = Math.max(0, items.length - n);
      o.idx = Math.min(o.idx, maxIdx);
      var cardW = items[0].offsetWidth || track.offsetWidth / n;
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 20;
      var step = cardW + gap;
      track.style.transform = "translateX(-" + (o.idx * step) + "px)";

      if (dotsWrap) {
        dotsWrap.innerHTML = "";
        for (var i = 0; i <= maxIdx; i++) {
          (function (k) {
            var d = document.createElement("button");
            d.type = "button";
            d.className = "carousel-dot" + (k === o.idx ? " active" : "");
            d.setAttribute("aria-label", "Slide " + (k + 1));
            d.addEventListener("click", function () { go(k); restart(); });
            dotsWrap.appendChild(d);
          })(i);
        }
      }
      if (prev) prev.disabled = o.idx <= 0;
      if (next) next.disabled = o.idx >= maxIdx;
    }

    function go(k) {
      var maxIdx = Math.max(0, items.length - cardsPerView());
      o.idx = Math.max(0, Math.min(k, maxIdx));
      refresh();
    }
    function next1() { go(Math.min(o.idx + 1, Math.max(0, items.length - cardsPerView()))); }
    function prev1() { go(o.idx - 1); }

    function restart() {
      if (o.timer) { clearInterval(o.timer); o.timer = null; }
      if (items.length > cardsPerView()) {
        o.timer = setInterval(function () {
          var maxIdx = Math.max(0, items.length - cardsPerView());
          o.idx = o.idx >= maxIdx ? 0 : o.idx + 1;
          refresh();
        }, 5000);
      }
    }

    if (prev) prev.addEventListener("click", function () { prev1(); restart(); });
    if (next) next.addEventListener("click", function () { next1(); restart(); });

    root.addEventListener("mouseenter", function () { if (o.timer) clearInterval(o.timer); });
    root.addEventListener("mouseleave", restart);

    refresh();
    restart();
  }

  function initAll() {
    rootCache.forEach(function (r) { if (r.o.timer) clearInterval(r.o.timer); });
    rootCache = [];
    document.querySelectorAll(".carousel").forEach(initOne);
  }

  function onResize() { initAll(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    window.addEventListener("load", initAll);
    setTimeout(initAll, 50);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("gf:reviews", initAll);

  window.GFCarousel = { init: initAll };
})();
/* GO FRIENDS — Tamil / English language toggle */
(function () {
  "use strict";

  var D = {
    "nav-home": { gb: "Home", ta: "முகப்பு" },
    "nav-services": { gb: "Services", ta: "சேவைகள்" },
    "nav-designs": { gb: "Designs", ta: "வடிவமைப்புகள்" },
    "nav-book": { gb: "Book Order", ta: "ஆர்டர் பதிவு" },
    "nav-price": { gb: "Price List", ta: "விலை பட்டியல்" },
    "nav-reviews": { gb: "Reviews", ta: "விமர்சனங்கள்" },
    "nav-contact": { gb: "Contact", ta: "தொடர்பு" },
    "nav-call": { gb: "Call Now", ta: "அழைக்கவும்" },

    "hero-more": { gb: "View Blouse Designs", ta: "பிளவுஸ் வடிவமைப்புகளை காண" },
    "hero-h1": { gb: "GO FRIENDS Tailoring Shop — Custom Blouse Stitching, Embroidery &amp; School Uniforms in Vengalapuram, Tirupathur", ta: "கோ பிரண்ட்ஸ் தையல் கடை — வேங்கலாபுரம், திருப்பத்தூரில் பிளவுஸ் தையல், எம்பிராய்டரி மற்றும் பள்ளி சீருடை" },

    "offer-1": { gb: "🪔 Pongal Special — 10% off on pattu pavadai & silk saree stitching", ta: "🪔 பொங்கல் சிறப்பு — பட்டு பாவாடை & பட்டு சேலை தையலில் 10% தள்ளுபடி" },
    "offer-2": { gb: "✨ Deepavali Special — Free zari border stitching on silk blouses", ta: "✨ தீபாவளி சிறப்பு — பட்டு பிளவுஸ்களுக்கு இலவச ஜரிகை ஓர தையல்" },
    "offer-3": { gb: "🌸 Free patta / maggam work on new saree blouses", ta: "🌸 புதிய சேலை பிளவுஸ்களுக்கு இலவச பட்டா / மகம் வேலை" },

    "sv-eyebrow": { gb: "What we do", ta: "நாங்கள் செய்வது" },
    "sv-title": { gb: "Traditional <em>Tailoring</em> For Everyone", ta: "அனைவருக்கும் பாரம்பரிய <em>தையல்</em>" },
    "sv-sub": { gb: "We stitch clothes that fit beautifully and last long.", ta: "உடலுக்கு நேர்த்தியாக பொருந்தும், நீடித்து உழைக்கும் ஆடைகளை தைக்கிறோம்." },

    "silk-eyebrow": { gb: "Silk & Bridal", ta: "பட்டு & திருமண" },
    "silk-title": { gb: "Silk <em>Splendour</em> — Traditional Work", ta: "பட்டு <em>அழகு</em> — பாரம்பரிய வேலைப்பாடு" },
    "silk-sub": { gb: "Special silk stitching for festivals, functions and weddings.", ta: "பண்டிகை, விழா மற்றும் திருமணங்களுக்கு சிறப்பு பட்டு தையல்." },

    "gl-eyebrow": { gb: "Tamil Nadu culture collection", ta: "தமிழ்நாடு பாரம்பரிய தொகுப்பு" },
    "gl-title": { gb: "Our <em>Blouse</em> Designs", ta: "எங்கள் <em>பிளவுஸ்</em> வடிவமைப்புகள்" },
    "gl-sub": { gb: "Every blouse is stitched to your exact measurements. Photos show the finish — tap to call for the exact price.", ta: "ஒவ்வொரு பிளவுஸும் உங்கள் அளவுகளுக்கு ஏற்ப தைக்கப்படுகிறது. புகைப்படங்கள் முடிவைக் காட்டுகின்றன — சரியான விலைக்கு அழைக்கவும்." },
    "gl-filter-all": { gb: "All", ta: "அனைத்தும்" },
    "gl-filter-blouse": { gb: "Blouse", ta: "பிளவுஸ்" },
    "gl-filter-girls": { gb: "Girls' Dress", ta: "சிறுமியர் உடை" },
    "gl-filter-uniform": { gb: "School Uniform", ta: "பள்ளி சீருடை" },
    "order-this": { gb: "Order on WhatsApp", ta: "வாட்ஸ்அப்பில் ஆர்டர்" },

    "cuts-eyebrow": { gb: "Traditional Cuts", ta: "பாரம்பரிய கட்" },
    "cuts-title": { gb: "Gramma's <em>&amp;</em> Grandma's Classic Neck Styles", ta: "பாட்டியின் பாரம்பரிய நெக் ஸ்டைல்கள்" },
    "cuts-sub": { gb: "Necklines handed down through Tamil tradition — each one a beauty of its own.", ta: "தமிழ் பாரம்பரியத்தில் இருந்து வந்த கழுத்து வடிவங்கள் — ஒவ்வொன்றும் தனி அழகு." },

    "bk-eyebrow": { gb: "Order your dress", ta: "உங்கள் உடையை ஆர்டர் செய்யுங்கள்" },
    "bk-title": { gb: "Book Your <em>Stitching</em>", ta: "தையலை <em>பதிவு</em> செய்யுங்கள்" },
    "bk-sub": { gb: "Fill in the form and send it on WhatsApp — we will confirm the price and delivery date.", ta: "படிவத்தை நிரப்பி வாட்ஸ்அப்பில் அனுப்புங்கள் — விலை மற்றும் டெலிவரி தேதியை உறுதி செய்வோம்." },
    "bk-name": { gb: "Your Name *", ta: "உங்கள் பெயர் *" },
    "bk-phone": { gb: "Mobile Number *", ta: "மொபைல் எண் *" },
    "bk-type": { gb: "What to stitch *", ta: "எதை தைக்க வேண்டும் *" },
    "bk-design": { gb: "Design / Style", ta: "வடிவமைப்பு / ஸ்டைல்" },
    "bk-meas": { gb: "Measurements", ta: "அளவுகள்" },
    "bk-date": { gb: "Need by date", ta: "தேவைப்படும் தேதி" },
    "bk-notes": { gb: "Any notes", ta: "குறிப்புகள்" },
    "bk-submit": { gb: "Send Order via WhatsApp", ta: "வாட்ஸ்அப்பில் ஆர்டர் அனுப்பு" },
    "bk-orcall": { gb: "Or Call 9751590453", ta: "அல்லது 9751590453 அழைக்கவும்" },
    "bk-choose": { gb: "Choose…", ta: "தேர்வு…" },
    "bk-type-blouse": { gb: "Women's Blouse", ta: "மகளிர் பிளவுஸ்" },
    "bk-type-girls": { gb: "Girls' Dress", ta: "சிறுமியர் உடை" },
    "bk-type-uniform": { gb: "School Uniform", ta: "பள்ளி சீருடை" },
    "bk-type-emb": { gb: "Embroidery / Zari Work", ta: "எம்பிராய்டரி / ஜரிகை" },
    "bk-type-other": { gb: "Other", ta: "மற்றவை" },

    "st:Received": { gb: "Received", ta: "பெறப்பட்டது" },
    "st:In Progress": { gb: "In Progress", ta: "வேலை நடக்கிறது" },
    "st:Ready": { gb: "Ready", ta: "தயார்" },
    "st:Delivered": { gb: "Delivered", ta: "ஒப்படைக்கப்பட்டது" },

    "ab-eyebrow": { gb: "About us", ta: "எங்களைப் பற்றி" },
    "ab-title": { gb: "GO FRIENDS <em>Tailoring</em> Shop", ta: "கோ பிரண்ட்ஸ் <em>தையல்</em> கடை" },

    "rv-eyebrow": { gb: "Happy customers", ta: "மகிழ்ச்சியான வாடிக்கையாளர்கள்" },
    "rv-title": { gb: "What Our Customers <em>Say</em>", ta: "எங்கள் வாடிக்கையாளர்கள் சொல்வது" },
    "rv-sub": { gb: "Real words from the people who wear our stitching.", ta: "எங்கள் தையலை அணிந்தவர்களின் உண்மையான வார்த்தைகள்." },

    "pr-eyebrow": { gb: "Transparent pricing", ta: "நேர்மையான விலை" },
    "pr-title": { gb: "Our <em>Price</em> List", ta: "எங்கள் <em>விலை</em> பட்டியல்" },
    "pr-sub": { gb: "Honest rates for every budget. Final price depends on fabric and design — we confirm before starting.", ta: "ஒவ்வொரு பட்ஜெட்டுக்கும் நேர்மையான விலைகள். இறுதி விலை துணி மற்றும் வடிவமைப்பை பொறுத்தது — தொடங்குவதற்கு முன் உறுதி செய்வோம்." },

    "tp-eyebrow": { gb: "Tailor's tips", ta: "தையல் குறிப்புகள்" },
    "tp-title": { gb: "Stitching <em>Tips &amp; Guide</em>", ta: "தையல் <em>குறிப்புகள் & வழிகாட்டி</em>" },
    "tp-sub": { gb: "Small habits that make your clothes last longer and fit better.", ta: "உங்கள் ஆடைகள் நீடித்து, நன்றாக பொருந்த சிறிய பழக்கங்கள்." },

    "rm-title": { gb: "Set a measurement / trial reminder", ta: "அளவீடு / டிரையல் நினைவூட்டல்" },

    "ft-tag": { gb: "GO FRIENDS Tailoring &amp; Embroidery", ta: "கோ பிரண்ட்ஸ் தையல் & எம்பிராய்டரி" },
    "ft-rights": { gb: "Vanakkam • © <span id='year'></span> GO FRIENDS. All rights reserved.", ta: "வணக்கம் • © <span id='year'></span> கோ பிரண்ட்ஸ். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை." }
  };

  var cur = "gb";
  try { cur = localStorage.getItem("gofriends_lang") === "ta" ? "ta" : "gb"; } catch (e) {}

  function t(key) {
    return (D[key] && D[key][cur]) || key;
  }
  function htmlStr() {
    return { gb: "EN", ta: "தமிழ்" }[cur];
  }

  function apply() {
    document.documentElement.lang = cur === "ta" ? "ta" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.placeholder = t(el.getAttribute("data-i18n-ph"));
    });
    var curTitle = cur === "ta"
      ? "கோ பிரண்ட்ஸ் தையல் | பிளவுஸ் தையல் கடை — வேங்கலாபுரம்"
      : "GO FRIENDS Tailoring | Traditional Blouse Stitching - Vengalapuram";
    document.title = curTitle;
    var tg = document.getElementById("langToggle");
    if (tg) tg.textContent = htmlStr();
    window.dispatchEvent(new Event("gf:lang"));
  }

  function toggle() {
    cur = cur === "ta" ? "gb" : "ta";
    try { localStorage.setItem("gofriends_lang", cur); } catch (e) {}
    apply();
  }

  function init() {
    var btn = document.getElementById("langToggle");
    if (btn) btn.addEventListener("click", function () { toggle(); });
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.GFI18N = { t: t, apply: apply, toggle: toggle, lang: function () { return cur; } };
})();
(function () {
  "use strict";

  var STORE = "gofriends_designs";
  var RSTORE = "gofriends_reviews";
  var SESSION = "gofriends_admin";
  var PHONE = "9751590453";
  var ADMIN_PASS = "12345";

  var DEFAULT_CARDS = [
    { id: "d1", name: "Round Neck Blouse", img: "images/model-1.jpg", category: "blouse", isNew: true },
    { id: "d2", name: "Designer Blouse", img: "images/model-2.jpg", category: "blouse", isNew: true },
    { id: "d3", name: "Designer Blouse", img: "images/model-3.jpg", category: "blouse", isNew: true }
  ];

  var DEFAULT_REVIEWS = [
    { id: "r1", name: "Priya", stars: 5, text: "Very neat stitching, my blouse fits perfectly. Good price and ready on time!", img: "" },
    { id: "r2", name: "Kavitha", stars: 5, text: "Great tailoring shop in Vengalapuram. My daughter's school uniform was stitched very nicely.", img: "" },
    { id: "r3", name: "Meena", stars: 4, text: "Beautiful maggam work blouse. I am very happy with the service.", img: "" }
  ];

  var loginModal, adminModal, editModal;
  var editingId = null;
  var activeTab = "designs";
  var activeFilter = "all";
  var orderCache = [];

  function load(key, fallback) {
    try {
      var d = JSON.parse(localStorage.getItem(key));
      if (d && d.length) return d;
    } catch (e) {}
    return fallback.slice();
  }
  function save(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch (e) { alert("Storage is full. Try a smaller photo, or delete something first."); }
  }
  function t(key) { return window.GFI18N ? window.GFI18N.t(key) : key; }
  function wa(phone, msg) {
    window.open("https://wa.me/91" + phone + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }
  function statusLabel(s) { return t("st:" + s); }
  function statusClass(s) {
    return ({ "Received": "st-gold", "In Progress": "st-blue", "Ready": "st-green", "Delivered": "st-grey" }[s]) || "st-gold";
  }
  function fmt(ms) {
    try { return new Date(ms).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return ""; }
  }

  var cards = load(STORE, DEFAULT_CARDS);
  var reviews = load(RSTORE, DEFAULT_REVIEWS);

  /* ================= Public gallery rendering ================= */
  function renderGallery() {
    var grid = document.getElementById("fittingsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    cards.forEach(function (c) {
      if (activeFilter !== "all" && c.category !== activeFilter) return;

      var art = document.createElement("article");
      art.className = "fitting-card";
      art.setAttribute("data-category", c.category || "blouse");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fitting-photo";
      btn.setAttribute("aria-label", "View " + c.name + " larger");

      var img = document.createElement("img");
      img.src = c.img;
      img.alt = c.name;
      img.loading = "lazy";
      btn.appendChild(img);

      if (c.isNew) {
        var badge = document.createElement("span");
        badge.className = "fitting-new";
        badge.textContent = "New";
        btn.appendChild(badge);
      }

      var body = document.createElement("div");
      body.className = "fitting-body";
      var h = document.createElement("h3");
      h.textContent = c.name;
      body.appendChild(h);

      var order = document.createElement("a");
      order.className = "link-order";
      order.target = "_blank";
      order.rel = "noopener";
      order.textContent = t("order-this");
      order.href = "https://wa.me/91" + PHONE + "?text=" +
        encodeURIComponent("Hello GO FRIENDS, I'd like to order this design: " + c.name + ". Please confirm price and delivery time.");
      body.appendChild(order);

      art.appendChild(btn);
      art.appendChild(body);
      grid.appendChild(art);

      btn.addEventListener("click", function () {
        if (window.GFLightbox) window.GFLightbox.open(c.img, c.name, "Category: " + categoryLabel(c.category) + " — tap order or call " + PHONE + ".");
      });
    });
  }

  function categoryLabel(v) {
    return { blouse: "Blouse", girls: "Girls Dress", uniform: "School Uniform", other: "Other" }[v] || "Blouse";
  }

  /* ================= Reviews rendering ================= */
  function starsHTML(n) {
    var s = "";
    for (var i = 1; i <= 5; i++) s += i <= n ? "★" : "☆";
    return s;
  }

  function renderReviews() {
    var grid = document.getElementById("reviewsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (!reviews.length) {
      grid.innerHTML = "<p class='review-empty'>No reviews yet — add one from the Admin panel.</p>";
    }
    reviews.forEach(function (r) {
      var card = document.createElement("div");
      card.className = "review-card";

      var top = document.createElement("div");
      top.className = "review-top";

      var ava = document.createElement("div");
      ava.className = "review-ava";
      if (r.img) {
        var img = document.createElement("img");
        img.src = r.img;
        img.alt = r.name;
        ava.appendChild(img);
      } else {
        ava.textContent = (r.name || "G").charAt(0).toUpperCase();
      }

      var head = document.createElement("div");
      head.className = "review-head";
      var name = document.createElement("strong");
      name.textContent = r.name || "Customer";
      var stars = document.createElement("span");
      stars.className = "review-stars";
      stars.textContent = starsHTML(r.stars);
      stars.setAttribute("aria-label", r.stars + " out of 5 stars");
      head.appendChild(name);
      head.appendChild(stars);

      top.appendChild(ava);
      top.appendChild(head);

      var text = document.createElement("p");
      text.className = "review-text";
      text.textContent = r.text;

      card.appendChild(top);
      card.appendChild(text);
      grid.appendChild(card);
    });
    window.dispatchEvent(new Event("gf:reviews"));
  }

  /* ================= Filters ================= */
  function initFilter() {
    var bar = document.getElementById("galleryFilter");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      activeFilter = btn.getAttribute("data-filter");
      renderGallery();
    });
  }

  /* ================= Admin list rendering ================= */
  function renderAdminList() {
    var list = document.getElementById("adminList");
    if (!list) return;
    list.innerHTML = "";

    if (activeTab === "designs" || activeTab === "reviews") {
      renderContentRows(list);
    } else if (activeTab === "orders") {
      renderOrders(list);
    } else if (activeTab === "reports") {
      renderReports(list);
    }
  }

  function renderContentRows(list) {
    var isRev = activeTab === "reviews";
    var src = isRev ? reviews : cards;
    src.forEach(function (x) {
      var row = document.createElement("div");
      row.className = "admin-row";

      var img = document.createElement("img");
      if (x.img) { img.src = x.img; }
      else { img.style.background = "linear-gradient(120deg,#E8AEB7,#B0607A)"; }
      img.alt = x.name;

      var name = document.createElement("span");
      name.className = "admin-row-name";
      name.textContent = isRev ? (x.name + " · " + x.stars + "★") : (x.name + " · " + categoryLabel(x.category));

      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-gold btn-xs";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () { openEdit(x.id); });

      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-danger btn-xs";
      del.textContent = "Delete";
      del.addEventListener("click", function () { isRev ? removeReview(x.id) : removeCard(x.id); });

      row.appendChild(img); row.appendChild(name); row.appendChild(edit); row.appendChild(del);
      list.appendChild(row);
    });
    if (!src.length) list.innerHTML = "<p class='review-empty'>" + (isRev ? "No reviews yet." : "No designs yet.") + "</p>";
  }

  /* ---------- Orders (admin) ---------- */
  function renderOrders(list) {
    if (!orderCache.length) {
      list.innerHTML = "<p class='track-empty'>No orders yet — orders placed on the website will appear here.</p>";
      return;
    }
    orderCache.forEach(function (o) {
      var card = document.createElement("div");
      card.className = "order-card";

      var head = document.createElement("div");
      head.className = "order-head";
      var id = document.createElement("strong");
      id.textContent = o.id;
      var name = document.createElement("span");
      name.className = "order-cust";
      name.textContent = o.name + " · " + o.phone;
      head.appendChild(id); head.appendChild(name);

      var sel = document.createElement("select");
      sel.className = "order-status";
      ["Received", "In Progress", "Ready", "Delivered"].forEach(function (s) {
        var op = document.createElement("option");
        op.value = s;
        op.textContent = statusLabel(s);
        if (o.status === s) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () {
        GFStore.updateOrder(o.id, { status: sel.value });
      });

      var info = document.createElement("div");
      info.className = "order-info";
      var types = document.createElement("p");
      types.textContent = "• " + (o.type || "Other") + (o.design ? " — " + o.design : "");
      var lines = document.createElement("p");
      lines.textContent = "• " + (o.needBy ? "Need by " + fmt(new Date(o.needBy + "T00:00:00")) : "No date") +
        " · Placed " + fmt(o.createdAt);
      info.appendChild(types); info.appendChild(lines);

      var priceRow = document.createElement("div");
      priceRow.className = "order-price-row";
      var priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.className = "order-price-input";
      priceInput.value = o.price || "";
      priceInput.placeholder = "Price ₹";
      var priceSave = document.createElement("button");
      priceSave.type = "button";
      priceSave.className = "btn btn-gold btn-xs";
      priceSave.textContent = "Save ₹";
      priceSave.addEventListener("click", function () {
        var v = parseInt(priceInput.value, 10) || 0;
        GFStore.updateOrder(o.id, { price: v });
      });
      priceRow.appendChild(priceInput); priceRow.appendChild(priceSave);

      var actions = document.createElement("div");
      actions.className = "order-actions";
      var notif = document.createElement("button");
      notif.type = "button";
      notif.className = "btn btn-gold btn-xs";
      notif.textContent = "Notify on WhatsApp";
      notif.addEventListener("click", function () {
        var msg = "Hello " + o.name + ", this is GO FRIENDS Tailoring.\nYour order " + o.id + " (" + (o.type || "Other") + ") is now: " + statusLabel(sel.value) + ".";
        if ((parseInt(priceInput.value, 10) || 0) && sel.value === "Ready") msg += "\nTotal amount: ₹" + priceInput.value + ".";
        if (o.needBy) msg += "\nNeed by: " + o.needBy + ".";
        if (o.phone) wa(o.phone, msg);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-danger btn-xs";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        if (!confirm("Delete order " + o.id + "?")) return;
        GFStore.removeOrder(o.id).then(function () { refreshOrders(); });
      });
      actions.appendChild(notif); actions.appendChild(del);

      var body = document.createElement("div");
      body.className = "order-body";
      body.appendChild(info);
      body.appendChild(priceRow);
      body.appendChild(actions);
      body.appendChild(sel);

      card.appendChild(head);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  function refreshOrders() {
    GFStore.loadAll().then(function (list) {
      orderCache = list || [];
      if (activeTab === "orders") renderAdminList();
    });
  }

  /* ---------- Reports (admin) ---------- */
  function renderReports(list) {
    GFStore.getStats().then(function (s) {
      var grid = document.createElement("div");
      grid.className = "report-grid";
      var cards2 = [
        { label: "Total Orders", val: s.total },
        { label: "This Month", val: s.thisMonth },
        { label: "Pending", val: s.pending },
        { label: "Ready", val: s.ready },
        { label: "Delivered", val: s.delivered }
      ];
      cards2.forEach(function (c) {
        var el = document.createElement("div");
        el.className = "report-stat";
        var v = document.createElement("b");
        v.textContent = c.val;
        var l = document.createElement("span");
        l.textContent = c.label;
        el.appendChild(v); el.appendChild(l);
        grid.appendChild(el);
      });
      list.appendChild(grid);

      var ttt = document.createElement("h4");
      ttt.className = "report-title";
      ttt.textContent = "Orders by type";
      list.appendChild(ttt);
      list.appendChild(bars(s.byType, 40));

      var t2 = document.createElement("h4");
      t2.className = "report-title";
      t2.textContent = "Orders last 6 months";
      list.appendChild(t2);
      var months = {};
      (s.byMonth || []).forEach(function (m) { months[m.label] = m.count; });
      list.appendChild(bars(months, 50));
    });
  }

  function bars(mapObj, maxH) {
    var wrap = document.createElement("div");
    wrap.className = "report-bars";
    var keys = Object.keys(mapObj);
    if (!keys.length) {
      wrap.innerHTML = "<p class='track-empty'>No data yet.</p>";
      return wrap;
    }
    var vals = keys.map(function (k) { return mapObj[k]; });
    var mx = Math.max.apply(null, vals) || 1;
    keys.forEach(function (k) {
      var col = document.createElement("div");
      col.className = "report-bar-col";
      var bar = document.createElement("div");
      bar.className = "report-bar";
      bar.style.height = Math.max(6, (mapObj[k] / mx) * maxH) + "px";
      var num = document.createElement("span");
      num.className = "report-bar-num";
      num.textContent = mapObj[k];
      var lab = document.createElement("span");
      lab.className = "report-bar-label";
      lab.textContent = k;
      col.appendChild(num); col.appendChild(bar); col.appendChild(lab);
      wrap.appendChild(col);
    });
    return wrap;
  }

  /* ================= Admin view ================= */
  function setView(v, addBtn) {
    activeTab = v;
    document.querySelectorAll(".admin-tabs .tab").forEach(function (tab) {
      tab.classList.toggle("active", tab.getAttribute("data-tab") === v);
    });
    var hints = {
      designs: "Add, rename or delete design photos. Changes save automatically.",
      reviews: "Add or manage customer reviews and photos. Changes save automatically.",
      orders: "Update order status, set the price and notify customers on WhatsApp.",
      reports: "This month's orders and popular work."
    };
    document.getElementById("adminHint").textContent = hints[v] || "";
    if (addBtn) {
      var showBtn = v === "designs" || v === "reviews";
      addBtn.style.display = showBtn ? "" : "none";
      addBtn.textContent = v === "designs" ? "+ Add Design" : "+ Add Review";
    }
    if (v === "orders") refreshOrders();
    renderAdminList();
  }

  function removeCard(id) {
    if (!confirm("Delete this design?")) return;
    cards = cards.filter(function (c) { return c.id !== id; });
    save(STORE, cards);
    renderAdminList(); renderGallery();
  }
  function removeReview(id) {
    if (!confirm("Delete this review?")) return;
    reviews = reviews.filter(function (r) { return r.id !== id; });
    save(RSTORE, reviews);
    renderAdminList(); renderReviews();
  }

  /* ================= Image resize ================= */
  function resizeImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var max = 700, w = img.width, h = img.height;
        if (w > max) { h = h * max / w; w = max; }
        if (h > 900) { w = w * 900 / h; h = 900; }
        var cv = document.createElement("canvas");
        cv.width = Math.round(w);
        cv.height = Math.round(h);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ================= Edit modal ================= */
  function isReviewTab() { return activeTab === "reviews"; }
  function findCurrent() {
    return (activeTab === "designs" ? cards : reviews).filter(function (x) { return x.id === editingId; })[0];
  }

  function openEdit(id) {
    editingId = id || null;
    var isNew = editingId === null;
    var review = isReviewTab();
    var cur = isNew ? null : findCurrent();

    document.getElementById("editTitle").textContent =
      review ? (isNew ? "Add Review" : "Edit Review") : (isNew ? "Add Design" : "Edit Design");

    document.getElementById("editNameLabel").textContent = review ? "Customer name" : "Design name";
    document.getElementById("editName").value = cur ? (cur.name || "") : "";
    document.getElementById("editName").placeholder = review ? "e.g. Priya" : "e.g. Round Neck Blouse";

    var catEl = document.getElementById("editCategory");
    var catLab = document.getElementById("editCatLabel");
    catEl.hidden = review;
    catLab.hidden = review;
    if (!review) catEl.value = cur ? (cur.category || "blouse") : "blouse";

    var txtEl = document.getElementById("editText");
    var txtLabel = document.getElementById("editTextLabel");
    var stEl = document.getElementById("editStars");
    var stLabel = document.getElementById("editStarsLabel");
    txtEl.hidden = !review;
    txtLabel.hidden = !review;
    stEl.hidden = !review;
    stLabel.hidden = !review;
    if (review) {
      txtEl.value = cur ? (cur.text || "") : "";
      stEl.value = cur ? String(cur.stars || 5) : "5";
    }

    document.getElementById("editFile").value = "";
    var preview = document.getElementById("editPreview");
    preview.hidden = true;
    preview.removeAttribute("src");
    if (cur && cur.img) { preview.src = cur.img; preview.hidden = false; }

    show(editModal);
  }

  function saveFromModal() {
    var name = document.getElementById("editName").value.trim();
    var fileInput = document.getElementById("editFile");
    var review = isReviewTab();

    var process = function (img) {
      var finalImg = img || (editingId && (findCurrent() || {}).img) || "";
      if (review) {
        var text = document.getElementById("editText").value.trim();
        var stars = parseInt(document.getElementById("editStars").value, 10) || 5;
        if (!name) { alert("Please enter the customer name."); return; }
        if (!text) { alert("Please write the review text."); return; }
        if (editingId === null) {
          reviews.push({ id: "r" + Date.now(), name: name, text: text, stars: stars, img: finalImg });
        } else {
          reviews.forEach(function (r) {
            if (r.id === editingId) { r.name = name; r.text = text; r.stars = stars; if (finalImg) r.img = finalImg; }
          });
        }
        save(RSTORE, reviews);
        renderAdminList(); renderReviews();
      } else {
        var cat = document.getElementById("editCategory").value;
        if (!finalImg && editingId === null) { alert("Please choose a photo."); return; }
        if (editingId === null) {
          cards.push({ id: "d" + Date.now(), name: name || "New Design", img: finalImg, category: cat, isNew: true });
        } else {
          cards.forEach(function (c) {
            if (c.id === editingId) { c.name = name || c.name; c.category = cat; if (finalImg) c.img = finalImg; }
          });
        }
        save(STORE, cards);
        renderAdminList(); renderGallery();
      }
      hide(editModal);
    };

    if (fileInput.files && fileInput.files[0]) {
      resizeImage(fileInput.files[0], process);
    } else {
      process(null);
    }
  }

  /* ================= Modal helpers ================= */
  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }

  function tryLogin() {
    var pass = document.getElementById("adminPass").value;
    var err = document.getElementById("loginError");
    if (pass === ADMIN_PASS) {
      err.textContent = "";
      sessionStorage.setItem(SESSION, "1");
      hide(loginModal);
      show(adminModal);
      renderAdminList();
      document.getElementById("adminPass").value = "";
    } else {
      err.textContent = "Wrong password. Try again.";
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION);
    hide(adminModal);
  }

  /* ================= Init ================= */
  function init() {
    loginModal = document.getElementById("loginModal");
    adminModal = document.getElementById("adminModal");
    editModal = document.getElementById("editModal");

    renderGallery();
    renderReviews();
    initFilter();

    var addBtn = document.getElementById("addBtn");

    document.getElementById("adminBtn").addEventListener("click", function () {
      if (sessionStorage.getItem(SESSION)) {
        show(adminModal);
        renderAdminList();
      } else {
        show(loginModal);
        document.getElementById("adminPass").focus();
      }
    });
    document.getElementById("loginBtn").addEventListener("click", tryLogin);
    document.getElementById("loginClose").addEventListener("click", function () {
      hide(loginModal);
      document.getElementById("loginError").textContent = "";
    });
    document.getElementById("adminPass").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryLogin();
    });

    document.getElementById("adminClose").addEventListener("click", function () { hide(adminModal); });
    document.getElementById("logoutBtn").addEventListener("click", logout);

    document.querySelectorAll(".admin-tabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () { setView(tab.getAttribute("data-tab"), addBtn); });
    });

    addBtn.addEventListener("click", function () { openEdit(null); });
    document.getElementById("editCancel").addEventListener("click", function () { hide(editModal); });
    document.getElementById("editSave").addEventListener("click", saveFromModal);
    document.getElementById("editFile").addEventListener("change", function () {
      var f = this.files && this.files[0];
      var preview = document.getElementById("editPreview");
      if (f) {
        resizeImage(f, function (data) { preview.src = data; preview.hidden = false; });
      }
    });

    window.addEventListener("gf:lang", function () { renderGallery(); renderReviews(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
/* GO FRIENDS — booking, reminders & order history */
(function () {
  "use strict";

  var form = document.getElementById("bookingForm");
  var PHONE = "9751590453";
  var BACKUP_PHONE = "6381077597";
  var MIN_LEAD_DAYS = 5;
  var DATE_FMT = { year: "numeric", month: "short", day: "numeric" };

  function fmt(ms) { return new Date(ms).toLocaleDateString("en-GB", DATE_FMT); }
  function minLeadStr() {
    var d = new Date();
    d.setDate(d.getDate() + MIN_LEAD_DAYS);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function wa(phone, msg) {
    window.open("https://wa.me/91" + phone + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }
  function notify(msg) { wa(PHONE, msg); wa(BACKUP_PHONE, msg); }
  function t(key) { return window.GFI18N ? window.GFI18N.t(key) : key; }
  function statusLabel(s) { return t("st:" + s); }

  /* ================= Booking submit ================= */
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("bkName").value.trim();
      var phone = document.getElementById("bkPhone").value.trim();
      var type = document.getElementById("bkType").value;
      var design = document.getElementById("bkDesign").value.trim();
      var meas = document.getElementById("bkMeas").value.trim();
      var date = document.getElementById("bkDate").value;
      var notes = document.getElementById("bkNotes").value.trim();

      if (!name || !phone || !type) {
        setHint("bkDateHint", "Please fill Name, Mobile and Stitching type.", "err");
        return;
      }
      if (date && date < minLeadStr()) {
        setHint("bkDateHint", "We need at least " + MIN_LEAD_DAYS + " days for this order. Earliest date: " + fmt(new Date(minLeadStr())) + ".", "err");
        document.getElementById("bkDate").focus();
        return;
      }

      GFStore.createOrder({
        name: name, phone: phone, type: type, design: design,
        measurements: meas, needBy: date, notes: notes
      }).then(function (order) {
        var msg =
          "NEW ORDER - GO FRIENDS TAILORING\n" +
          "Order No: " + order.id + "\n" +
          "----------------------------\n" +
          "Name: " + name + "\n" +
          "Mobile: " + phone + "\n" +
          "Stitching: " + type + "\n" +
          (design ? "Design: " + design + "\n" : "") +
          (meas ? "Measurements: " + meas + "\n" : "") +
          (date ? "Need by: " + date + "\n" : "") +
          (notes ? "Notes: " + notes + "\n" : "") +
          "----------------------------\n";
        notify(msg);

        showResult(order);
        form.reset();
        document.getElementById("bkResult").scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function showResult(order) {
    var el = document.getElementById("bkResult");
    if (!el) return;
    var id = document.getElementById("bkOrderId");
    if (id) id.textContent = order.id;
    var hint = document.getElementById("bkOrderHint");
    if (hint) hint.textContent = "Your order is now " + statusLabel(order.status) + ". We will confirm the price and delivery date on WhatsApp.";
    el.hidden = false;
  }

  /* ================= Date availability ================= */
  var dateInput = document.getElementById("bkDate");
  if (dateInput) {
    dateInput.min = minLeadStr();
    dateInput.addEventListener("change", function () {
      var v = dateInput.value;
      if (!v) { setHint("bkDateHint", "", ""); return; }
      if (v < minLeadStr()) {
        setHint("bkDateHint", "We need at least " + MIN_LEAD_DAYS + " days. Earliest: " + fmt(new Date(minLeadStr())) + ".", "warn");
        return;
      }
      GFStore.loadAll().then(function (list) {
        if (!Array.isArray(list)) list = [];
        var busy = list.filter(function (o) { return o.needBy === v && o.status !== "Delivered"; }).length;
        if (busy >= 4) {
          setHint("bkDateHint", "That date is quite full (" + busy + " orders already). It's okay to send — we will confirm.", "warn");
        } else {
          setHint("bkDateHint", "Date available — we will confirm on WhatsApp.", "ok");
        }
      });
    });
  }

  /* ================= Order history prefill ================= */
  var bkPhone = document.getElementById("bkPhone");
  if (bkPhone) {
    bkPhone.addEventListener("blur", function () {
      var ph = bkPhone.value;
      if (!ph || ph.replace(/[^0-9]/g, "").length < 10) return;
      GFStore.byPhone(ph).then(function (list) {
        if (!list || !list.length) return;
        var last = list[0];
        var meas = document.getElementById("bkMeas");
        if (meas && !meas.value && last.measurements) {
          meas.value = last.measurements;
          setHint("bkDateHint", "Welcome back! We remembered your last measurements.", "ok");
        }
        var design = document.getElementById("bkDesign");
        if (design && !design.value && last.design) design.value = last.design;
      });
    });
  }

  /* ================= Reminder ================= */
  var rmForm = document.getElementById("reminderForm");
  if (rmForm) {
    rmForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var date = document.getElementById("rmDate").value;
      var time = document.getElementById("rmTime").value || "10:00 AM";
      var phone = document.getElementById("rmPhone").value.trim();
      if (!date || phone.replace(/[^0-9]/g, "").length < 10) {
        setHint("rmResult", "Please enter a date and a valid 10-digit mobile number.", "err");
        return;
      }
      var msg =
        "REMINDER - GO FRIENDS TAILORING\n" +
        "I would like to visit for measurement / trial.\n" +
        "Date: " + fmt(new Date(date + "T00:00:00")) + " at " + time + "\n" +
        "My number: " + phone;
      notify(msg);
      GFStore.addReminder({ phone: phone, date: date, time: time });
      setHint("rmResult", "Reminder sent to WhatsApp. We will also show it when you visit the site again.", "ok");
      rmForm.reset();
    });
  }

  /* ================= Due reminder banner ================= */
  var rmClose = document.getElementById("rmBannerClose");
  if (rmClose) {
    rmClose.addEventListener("click", function () {
      var banner = document.getElementById("rmBanner");
      if (banner) banner.hidden = true;
      GFStore.dueReminders().forEach(function (r) { GFStore.removeReminder(r.id); });
    });
  }

  function setHint(id, text, kind) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!text) { el.textContent = ""; el.className = "hint"; return; }
    el.textContent = text;
    el.className = "hint hint-" + kind;
  }

  /* Show banner if any reminder is due */
  function initBanner() {
    var banner = document.getElementById("rmBanner");
    if (!banner) return;
    var due = GFStore.dueReminders();
    if (!due.length) return;
    var txt = document.getElementById("rmBannerText");
    if (txt) {
      txt.textContent = "Reminder: " + due.map(function (r) { return fmt(new Date(r.date + "T00:00:00")); }).join(", ") +
        " — time for your measurement / trial visit. Contact 9751590453.";
    }
    banner.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBanner);
  } else {
    initBanner();
  }
})();
(function () {
  "use strict";

  var header = document.getElementById("header");
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener("click", function () {
    nav.classList.toggle("open");
    navToggle.classList.toggle("open");
    navToggle.setAttribute("aria-label", nav.classList.contains("open") ? "Close menu" : "Open menu");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
      navToggle.classList.remove("open");
    });
  });

  /* Scroll reveal UX */
  var revealTargets = document.querySelectorAll(
    ".section > .container > *:not(.reveal), .hero-bg, .footer-inner"
  );
  revealTargets.forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.transitionDelay = (i % 4) * 80 + "ms";
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("in"); });
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();