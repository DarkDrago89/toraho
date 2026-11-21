// Mengolah logo Toraho (harimau hitam di latar putih) menjadi aset konsep produksi:
//  - tiger-halftone.svg : titik vektor untuk sablon 1 warna (gradasi api → ukuran titik)
//  - tiger-flat.png     : siluet rata 1 tingkat untuk bordir / stensil
//  - tiger-2tone.png    : 2 tingkat (putih + abu) untuk sablon 2 warna
// Pakai: node make-design-assets.cjs <logo-source> <out-dir> <toraho-dir>
const path = require("node:path");
const fs = require("node:fs");
const [, , src, outDir, torahoDir] = process.argv;
const sharp = require(path.join(torahoDir, "node_modules", "sharp"));

// Area kepala harimau + api di logo 2000×2000 (tanpa teks TORAHO).
const MARK = { left: 420, top: 370, width: 1150, height: 900 };

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  // Coverage tinta 0..1 (hitam = 1).
  const W = 600;
  const H = Math.round((W * MARK.height) / MARK.width);
  const { data } = await sharp(src).extract(MARK).resize(W, H).grayscale().raw().toBuffer({ resolveWithObject: true });
  const cov = (x, y) => 1 - data[y * W + x] / 255;

  // 1) Halftone vektor: grid miring 0° sederhana, jarak 8px, radius ∝ √coverage.
  const step = 8;
  let dots = "";
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      let s = 0, n = 0;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const xx = Math.min(W - 1, Math.max(0, Math.round(x + dx)));
          const yy = Math.min(H - 1, Math.max(0, Math.round(y + dy)));
          s += cov(xx, yy);
          n++;
        }
      const c = s / n;
      if (c < 0.06) continue;
      const r = Math.min(step * 0.62, Math.sqrt(c) * step * 0.6);
      dots += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}"/>`;
    }
  }
  fs.writeFileSync(
    path.join(outDir, "tiger-halftone.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><g fill="#f2f2f2">${dots}</g></svg>`,
  );

  // 2) & 3) Raster tingkat (putih/abu/transparan) dari coverage.
  async function levels(name, map) {
    const big = await sharp(src).extract(MARK).resize(1200).grayscale().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = big.info;
    const out = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const [r, g, b, a] = map(1 - big.data[i] / 255);
      out.set([r, g, b, a], i * 4);
    }
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).median(3).png().toFile(path.join(outDir, name));
  }
  await levels("tiger-flat.png", (c) => (c > 0.42 ? [242, 242, 242, 255] : [0, 0, 0, 0]));
  await levels("tiger-2tone.png", (c) => (c > 0.62 ? [242, 242, 242, 255] : c > 0.22 ? [120, 120, 120, 255] : [0, 0, 0, 0]));

  console.log("aset dibuat di", outDir);
})();
