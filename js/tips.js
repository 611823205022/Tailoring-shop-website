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