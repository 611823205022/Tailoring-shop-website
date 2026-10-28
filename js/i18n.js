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