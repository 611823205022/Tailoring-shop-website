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