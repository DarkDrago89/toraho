// Mengambil SILUET (bentuk saja) dari foto referensi baju gelap di latar terang.
// Tidak ada piksel foto (warna, tekstur, teks merek) yang dipakai: hasilnya hanya topeng hitam-putih.
// Pakai: node make-silhouettes.cjs <images-dir> <out-dir> <toraho-dir>
const path = require("node:path");
const fs = require("node:fs");
const [, , imgDir, outDir, torahoDir] = process.argv;
const sharp = require(path.join(torahoDir, "node_modules", "sharp"));

const JOBS = [
  { src: "2.webp", name: "sil-hoodie-front", thr: 110 },
  { src: "3.png", name: "sil-hoodie-back", thr: 110 },
  { src: "4.webp", name: "sil-jacket-front", thr: 110 },
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const report = {};
  for (const j of JOBS) {
    const { data, info } = await sharp(path.join(imgDir, j.src)).grayscale().blur(1.2).raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    // Flood fill latar terang dari tepi; yang tak terjangkau = baju (lubang kecil ikut terisi).
    const bg = new Uint8Array(W * H);
    const q = new Int32Array(W * H);
    let qh = 0, qt = 0;
    const push = (i) => { if (!bg[i] && data[i] > j.thr) { bg[i] = 1; q[qt++] = i; } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
    }
    let minX = W, minY = H, maxX = 0, maxY = 0;
    const out = Buffer.alloc(W * H);
    for (let i = 0; i < W * H; i++) if (!bg[i]) {
      out[i] = 255; const x = i % W, y = (i / W) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    // Topeng putih beralpha, dipotong ke batas baju, tinggi 600 px.
    const h600 = 600, w600 = Math.round((bw * h600) / bh);
    const { data: alpha, info: ai } = await sharp(out, { raw: { width: W, height: H, channels: 1 } })
      .extract({ left: minX, top: minY, width: bw, height: bh })
      .median(5)
      .resize(w600, h600)
      .extractChannel(0)
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (ai.channels !== 1 || ai.width !== w600) throw new Error("channel/ukuran tak terduga " + JSON.stringify(ai));
    const rgba = Buffer.alloc(w600 * h600 * 4);
    for (let i = 0; i < w600 * h600; i++) rgba.set([255, 255, 255, alpha[i]], i * 4);
    await sharp(rgba, { raw: { width: w600, height: h600, channels: 4 } }).png().toFile(path.join(outDir, j.name + ".png"));

    // Lebar baju per baris (untuk mengukur bahu, ketiak, rib, dll.)
    const rows = [];
    for (let y = 0; y < h600; y += 25) {
      let l = -1, r = -1;
      for (let x = 0; x < w600; x++) if (alpha[y * w600 + x] > 128) { if (l < 0) l = x; r = x; }
      rows.push(`${y}:${l}-${r}`);
    }
    report[j.name] = { w: w600, h: h600, rows: rows.join(" ") };
  }
  fs.writeFileSync(path.join(outDir, "silhouettes.json"), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
})();
