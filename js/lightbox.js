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