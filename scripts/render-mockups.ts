// Merender foto produk Koleksi 01 dari halaman desain (design/koleksi-01/koleksi-01.html).
// Tiap konsep (dan tiap sisi: depan/belakang) dipotong ke rasio 3:4, difoto dengan Chrome headless,
// lalu disimpan sebagai WebP di public/products/koleksi-01/.
// Pakai: npx tsx scripts/render-mockups.ts [slug ...]   (CHROME_PATH bisa diatur jika Chrome di lokasi lain)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { KOLEKSI_01, productImages } from "../src/data/koleksi-01";

const ROOT = process.cwd();
const DESIGN_DIR = path.join(ROOT, "design", "koleksi-01");
const OUT_DIR = path.join(ROOT, "public", "products", "koleksi-01");
const TMP = path.join(os.tmpdir(), "toraho-render");
const CHROME =
  process.env.CHROME_PATH ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].find(
    (p) => existsSync(p),
  );
if (!CHROME) throw new Error("Chrome/Edge tidak ditemukan. Atur CHROME_PATH.");

const W = 900, H = 1200; // 3:4
const BG = "#e4e4e0";

const html = readFileSync(path.join(DESIGN_DIR, "koleksi-01.html"), "utf8");
const assetBase = pathToFileURL(DESIGN_DIR + path.sep).href;
const fixHref = (s: string) => s.replaceAll('href="/files/', `href="${assetBase}`);

function block(from: number, open = "<svg", close = "</svg>") {
  const a = html.indexOf(open, from);
  const b = html.indexOf(close, a);
  if (a < 0 || b < 0) throw new Error("svg tidak ditemukan");
  return html.slice(a, b + close.length);
}

const defs = fixHref(block(html.indexOf('<svg width="0" height="0"')));

function cardSvg(concept: string) {
  const at = html.indexOf(`data-choice="${concept}"`);
  if (at < 0) throw new Error(`konsep ${concept} tidak ada di halaman desain`);
  return fixHref(block(at)).replace(/<text[^>]*class="lbl"[^>]*>[\s\S]*?<\/text>/g, "");
}

/** viewBox potongan untuk satu sisi, dilebarkan ke 3:4 dengan sedikit ruang. */
function viewBoxFor(svg: string, view: "depan" | "belakang" | "full") {
  const vb = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
  let [x, y, w, h] = vb;
  if (view !== "full") {
    w = w / 2;
    if (view === "belakang") x += w;
    h -= 40; // buang baris label DEPAN/BELAKANG
  }
  const pad = 0.06;
  let cx = x + w / 2, cy = y + h / 2;
  w *= 1 + pad * 2; h *= 1 + pad * 2;
  if (w / h > 3 / 4) h = (w * 4) / 3; else w = (h * 3) / 4;
  return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}

/** Untuk foto satu sisi: tutup separuh lainnya dengan warna latar agar lengan sisi sebelah tidak ikut masuk. */
function hideOtherHalf(svg: string, view: "depan" | "belakang" | "full") {
  if (view === "full") return svg;
  const [x, y, w, h] = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
  const half = w / 2;
  const rect =
    view === "depan"
      ? `<rect x="${x + half}" y="${y - h}" width="${w * 2}" height="${h * 3}" fill="${BG}"/>`
      : `<rect x="${x - w * 2}" y="${y - h}" width="${w * 2 + half}" height="${h * 3}" fill="${BG}"/>`;
  return svg.replace(/<\/svg>\s*$/, `${rect}</svg>`);
}

function page(svg: string, viewBox: string) {
  const sized = svg
    .replace(/<svg([^>]*?)viewBox="[^"]+"/, `<svg$1viewBox="${viewBox}"`)
    .replace(/<svg([^>]*?)style="[^"]*"/, "<svg$1")
    .replace("<svg", `<svg width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"`);
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&family=Archivo:wght@800;900&display=block">
<style>html,body{margin:0;background:${BG};overflow:hidden}
.jp{font-family:"Noto Serif JP","Yu Mincho","MS Mincho",serif;font-weight:900}
.ar{font-family:Archivo,"Arial Black",Arial,sans-serif;font-weight:900}
svg{display:block}</style></head><body>${defs}${sized}</body></html>`;
}

async function main() {
const only = new Set(process.argv.slice(2));
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

for (const p of KOLEKSI_01) {
  if (only.size && !only.has(p.slug)) continue;
  const svg = cardSvg(p.concept);
  const urls = productImages(p);
  for (const [i, view] of p.views.entries()) {
    const file = path.join(TMP, `${p.slug}-${view}.html`);
    const png = path.join(TMP, `${p.slug}-${view}.png`);
    writeFileSync(file, page(hideOtherHalf(svg, view), viewBoxFor(svg, view)));
    execFileSync(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--allow-file-access-from-files", `--window-size=${W},${H}`, "--virtual-time-budget=6000",
      `--screenshot=${png}`, pathToFileURL(file).href,
    ], { stdio: "ignore" });
    const out = path.join(ROOT, "public", urls[i]);
    await sharp(png).resize(W, H).webp({ quality: 86 }).toFile(out);
    console.log("✓", urls[i]);
  }
}
rmSync(TMP, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
