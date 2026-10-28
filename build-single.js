const fs = require("fs");
const path = require("path");

function b64(file) {
  return "data:" + mime(file) + ";base64," + fs.readFileSync(file).toString("base64");
}
function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".gif": "image/gif" }[ext] || "application/octet-stream";
}
function exists(file) { return fs.existsSync(file); }
function safeB64(file) { return exists(file) ? b64(file) : ""; }

let html = fs.readFileSync("index.html", "utf8");

const css = fs.readFileSync("css/style.css", "utf8");
const cssInline = css.replace(/url\(\s*["']?\.\.\/assets\/([^"')]+)["']?\s*\)/g, function (m, name) {
  const f = path.join("assets", name);
  return exists(f) ? 'url("' + b64(f) + '")' : m;
});
html = html.replace(/<link[^>]*href=\"css\/style\.css\"[^>]*>/g, "<style>\n" + cssInline + "\n</style>");
html = html.replace(/<link[^>]*href=\"css\/style\.css\"[^>]*(\/?)>/g, "");

const scripts = ["js/store.js", "js/pricing.js", "js/offers.js", "js/tips.js", "js/lightbox.js", "js/carousel.js", "js/i18n.js", "js/admin.js", "js/booking.js", "js/main.js"];
scripts.forEach(function (file) {
  const tag = new RegExp('<script[^>]*src="' + file.replace(/\./g, "\\.") + '"[^>]*></script>', "g");
  html = html.replace(tag, "<script>\n" + fs.readFileSync(file, "utf8") + "\n</script>");
});

html = html.replace(/src=\"assets\/([^"]+)\"/g, function (m, name) {
  const f = path.join("assets", name);
  return exists(f) ? 'src="' + b64(f) + '"' : m;
});

html = html.replace(/href=\"assets\/([^"]+)\"/g, function (m, name) {
  const f = path.join("assets", name);
  return exists(f) ? 'href="' + b64(f) + '"' : m;
});

html = html.replace(/assets\/([\w\-\.]+)/g, function (m, name) {
  const f = path.join("assets", name);
  return exists(f) ? b64(f) : m;
});

let html2 = html.replace(/<img[^>]*>/g, function (img) {
  if (!/^data:/.test(img)) return img;
  const size = img.length;
  console.log("img inlined ~" + Math.round(size / 1024) + " KB");
  return img;
});

fs.mkdirSync(path.join("publish"), { recursive: true });
fs.writeFileSync(path.join("publish", "index.html"), html2);
console.log("Built publish/index.html (" + Math.round(html2.length / 1024) + " KB)");