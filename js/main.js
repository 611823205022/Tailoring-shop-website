(function () {
  "use strict";

  var viewportFrame = 0;

  function updateViewportMetrics() {
    if (viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(function () {
      viewportFrame = 0;
      var viewport = window.visualViewport;
      var width = viewport ? viewport.width : document.documentElement.clientWidth;
      var height = viewport ? viewport.height : window.innerHeight;
      var root = document.documentElement;

      root.style.setProperty("--viewport-height", Math.round(height) + "px");
      root.dataset.viewportWidth = Math.round(width);
      root.dataset.viewportHeight = Math.round(height);
    });
  }

  window.addEventListener("resize", updateViewportMetrics, { passive: true });
  window.addEventListener("orientationchange", updateViewportMetrics, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportMetrics, { passive: true });
  }
  updateViewportMetrics();

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
      navToggle.setAttribute("aria-label", "Open menu");
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