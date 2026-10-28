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