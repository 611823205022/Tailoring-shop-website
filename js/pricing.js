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