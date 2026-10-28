const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "my-website");
const imgs = path.join(out, "images");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(imgs, { recursive: true });

fs.readdirSync("assets").forEach(function (f) {
  fs.copyFileSync(path.join("assets", f), path.join(imgs, f));
});

let css = fs.readFileSync("css/style.css", "utf8");
css = css.replace(/\.\.\/assets\//g, "images/").replace(/url\("assets\//g, 'url("images/');
fs.writeFileSync(path.join(out, "style.css"), css);

let js = ["js/store.js", "js/pricing.js", "js/offers.js", "js/tips.js", "js/lightbox.js", "js/carousel.js", "js/i18n.js", "js/admin.js", "js/booking.js", "js/main.js"]
  .map(function (f) { return fs.readFileSync(f, "utf8"); })
  .join("\n");
js = js.replace(/assets\//g, "images/");
fs.writeFileSync(path.join(out, "script.js"), js);

let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/href="css\/style\.css"/g, 'href="style.css"');
["js/store.js", "js/pricing.js", "js/offers.js", "js/tips.js", "js/lightbox.js", "js/carousel.js", "js/i18n.js", "js/admin.js", "js/booking.js", "js/main.js"].forEach(function (f) {
  const tag = new RegExp('<script[^>]*src="' + f.replace(/\./g, "\\.") + '"[^>]*></script>', "g");
  html = html.replace(tag, "");
});
html = html.replace(/src="assets\//g, 'src="images/').replace(/href="assets\//g, 'href="images/');
html = html.replace(/(<\/body>)/, '  <script src="script.js"></script>\n$1');
fs.writeFileSync(path.join(out, "index.html"), html);

console.log("Built my-website/");
["./my-website/index.html", "./my-website/style.css", "./my-website/script.js", "./my-website/images"].forEach(function (f) { console.log("  " + f); });