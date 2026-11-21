// Membuat aset brand untuk tema gelap dari logo sumber (harimau hitam di atas latar putih).
// Pakai: npm run brand -- assets/logo-source.webp
// Hasil: public/brand/logo-white.png, public/brand/mark-white.png, src/app/icon.png
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = process.argv[2];
if (!src) {
  console.error("Pakai: npm run brand -- <path logo sumber>");
  process.exit(1);
}
mkdirSync("public/brand", { recursive: true });

/**
 * Latar putih → transparan, tinta gelap → putih.
 * Luminansi yang dinegasikan dipakai sebagai alpha, jadi gradasi abu-abu api tetap halus.
 */
async function toWhite(input, width) {
  const alpha = await sharp(input).resize({ width }).grayscale().negate().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = alpha.info;
  return sharp({ create: { width: w, height: h, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha.data, { raw: { width: w, height: h, channels: 1 } })
    .png();
}

// Batas isi logo pada sumber 2000×2000 (logo + teks), dan kepala harimau saja.
const FULL = { left: 380, top: 380, width: 1240, height: 1150 };
const MARK = { left: 420, top: 370, width: 1150, height: 900 };

const full = await sharp(src).extract(FULL).toBuffer();
await (await toWhite(full, 1200)).toFile("public/brand/logo-white.png");

// Kepala harimau dipusatkan di kanvas persegi putih agar ikon tidak gepeng.
const mark = await sharp(src)
  .extract(MARK)
  .resize({ width: 1150, height: 1150, fit: "contain", background: "#ffffff" })
  .toBuffer();
await (await toWhite(mark, 512)).toFile("public/brand/mark-white.png");

// Ikon aplikasi: mark putih di atas hitam Yami.
const markWhite = await (await toWhite(mark, 400)).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0b0b0b" } })
  .composite([{ input: markWhite, gravity: "center" }])
  .png()
  .toFile("src/app/icon.png");

console.log("Aset brand dibuat: public/brand/logo-white.png, public/brand/mark-white.png, src/app/icon.png");
