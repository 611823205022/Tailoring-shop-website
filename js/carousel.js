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