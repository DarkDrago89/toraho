// Membuat foto placeholder monokrom untuk produk contoh (public/seed/*.svg).
// Sekali jalan, hasilnya di-commit. Pakai: node scripts/make-seed-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const items = [
  ["sukajan-tora", "虎", "Sukajan"],
  ["sukajan-tora-2", "虎", "Sukajan · Belakang"],
  ["bomber-honoo", "炎", "Bomber"],
  ["coach-kumo", "雲", "Coach Jacket"],
  ["kaos-honoo", "火", "Kaos"],
  ["kaos-tora-kanji", "虎", "Kaos"],
  ["kaos-oversize-yami", "闇", "Oversize"],
  ["patch-kamon", "紋", "Patch"],
  ["tote-ukiyo", "浮", "Tote Bag"],
  ["topi-ronin", "浪", "Topi"],
];

mkdirSync("public/seed", { recursive: true });
for (const [name, kanji, label] of items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#2b2b2b"/><stop offset="1" stop-color="#101010"/>
    </radialGradient>
  </defs>
  <rect width="900" height="1200" fill="url(#g)"/>
  <rect x="40" y="40" width="820" height="1120" fill="none" stroke="#2f2f2f" stroke-width="2"/>
  <text x="450" y="700" text-anchor="middle" font-family="'Noto Serif JP','Yu Mincho',serif" font-weight="700" font-size="460" fill="#e9e9e9" fill-opacity="0.9">${kanji}</text>
  <text x="450" y="1080" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-weight="800" font-size="40" letter-spacing="14" fill="#8a8a8a">${label.toUpperCase()}</text>
</svg>`;
  writeFileSync(`public/seed/${name}.svg`, svg);
}
console.log(`${items.length} gambar placeholder dibuat di public/seed/`);
