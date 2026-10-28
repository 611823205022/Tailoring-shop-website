(function () {
  "use strict";

  var STORE = "gofriends_designs";
  var RSTORE = "gofriends_reviews";
  var SESSION = "gofriends_admin";
  var PHONE = "9751590453";
  var ADMIN_PASS = "12345";

  var DEFAULT_CARDS = [
    { id: "d1", name: "Round Neck Blouse", img: "assets/model-1.jpg", category: "blouse", isNew: true },
    { id: "d2", name: "Designer Blouse", img: "assets/model-2.jpg", category: "blouse", isNew: true },
    { id: "d3", name: "Designer Blouse", img: "assets/model-3.jpg", category: "blouse", isNew: true }
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