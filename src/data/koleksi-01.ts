/**
 * Koleksi 01 · 虎火: 27 produk hasil sesi desain (design/koleksi-01/koleksi-01.html).
 * `concept` = data-choice kartu konsep; foto dirender oleh scripts/render-mockups.ts.
 * Harga & stok adalah nilai awal: ubah lewat admin setelah dihitung dengan HPP vendor.
 */

export type KoleksiProduct = {
  concept: string;
  slug: string;
  name: string;
  category: "jaket" | "kaos" | "hoodie" | "merch";
  price: number;
  compareAtPrice?: number;
  weightGrams: number;
  featured?: boolean;
  description: string;
  views: ("depan" | "belakang" | "full")[];
  variants: { label: string; stock: number }[];
};

const SIZES = ["S", "M", "L", "XL", "XXL"];
const sized = (stock: number[]) => SIZES.map((label, i) => ({ label, stock: stock[i] }));
const KAOS = sized([5, 10, 10, 8, 4]);
const OUTER = sized([3, 6, 6, 5, 3]);
const one = (stock: number) => [{ label: "All size", stock }];
const GARMENT_VIEWS: KoleksiProduct["views"] = ["depan", "belakang"];
const MERCH_VIEWS: KoleksiProduct["views"] = ["full"];

const SABLON_KAOS = "Kaos katun combed 24s hitam, sablon plastisol. Potongan regular, jahitan rantai di bahu.";

export const KOLEKSI_01: KoleksiProduct[] = [
  // ---------- Kaos ----------
  {
    concept: "honoo-a", slug: "kaos-honoo-kuas-retak", name: "Kaos Honoo · Kuas Retak", category: "kaos", price: 179000, weightGrams: 220,
    description: `Kanji 火 (api) berukuran 28 cm di dada dengan tekstur sablon tua yang retak halus, plus label edisi kecil di bawah kerah belakang. ${SABLON_KAOS}`,
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "honoo-b", slug: "kaos-honoo-stempel-titik-api", name: "Kaos Honoo · Stempel & Titik Api", category: "kaos", price: 199000, weightGrams: 220, featured: true,
    description: `Depan: stempel hanko 火 di dada kiri. Belakang: 火 raksasa tersusun dari titik halftone, kanji vertikal 炎上虎火 dan katakana トラホ: gaya poster editorial. ${SABLON_KAOS}`,
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "honoo-c", slug: "kaos-honoo-lencana", name: "Kaos Honoo · Lencana Minimal", category: "kaos", price: 159000, weightGrams: 220,
    description: `Kaos harian dengan lencana bulat 火 di dada kiri dan 虎火 kecil di bawah kerah belakang. Minimalis, gampang dipadukan. ${SABLON_KAOS}`,
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "tora-a", slug: "kaos-tora-stensil", name: "Kaos Tora · Stensil Harimau", category: "kaos", price: 189000, weightGrams: 220, featured: true,
    description: `Harimau-api Toraho versi stensil tegas di punggung, kanji 虎火 vertikal dan wordmark TORAHO besar; harimau kecil di dada kiri. ${SABLON_KAOS}`,
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "tora-b", slug: "kaos-tora-poster-halftone", name: "Kaos Tora · Poster Halftone", category: "kaos", price: 199000, weightGrams: 220,
    description: `Punggung bergaya poster film: harimau halftone dalam bingkai, label “虎火 TIGER OF FIRE” dan tagline kecil. Wordmark TORAHO di tengah dada. ${SABLON_KAOS}`,
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "tora-c", slug: "kaos-tora-medali", name: "Kaos Tora · Medali Dua Warna", category: "kaos", price: 219000, compareAtPrice: 249000, weightGrams: 220,
    description: `Edisi terbatas: harimau putih-abu di dalam cincin teks melingkar “TORAHO · TIGER OF FIRE · 虎火”, medali kecil di dada. Sablon 2 warna. ${SABLON_KAOS}`,
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "yami-a", slug: "kaos-yami-ombak-senyap", name: "Kaos Oversize Yami · Ombak Senyap", category: "kaos", price: 229000, weightGrams: 260,
    description: "Kaos oversize 16s heavyweight, bahu jatuh. Ombak seigaiha tonal abu-gelap naik dari bawah depan & belakang, logo kecil di dada, 闇 di tengkuk. Terlihat polos dari jauh, detail saat dekat.",
    views: GARMENT_VIEWS, variants: KAOS,
  },
  {
    concept: "yami-b", slug: "kaos-yami-bayangan-harimau", name: "Kaos Oversize Yami · Bayangan Harimau", category: "kaos", price: 229000, weightGrams: 260, featured: true,
    description: "Kaos oversize 16s heavyweight. Harimau raksasa dicetak hitam-doff di atas hitam, hanya terlihat saat terkena cahaya. 闇 putih kecil di dada.",
    views: GARMENT_VIEWS, variants: KAOS,
  },

  // ---------- Hoodie ----------
  {
    concept: "hoodie-a", slug: "hoodie-tora-stensil", name: "Hoodie Tora · Stensil + Lengan", category: "hoodie", price: 429000, weightGrams: 650, featured: true,
    description: "Hoodie fleece 330 gsm potongan boxy oversize. Depan: wordmark TORAHO; lengan kiri: 虎火 · TORAHO; belakang: harimau stensil + 虎火 vertikal di bawah tudung. Rib tebal di pinggang & manset.",
    views: GARMENT_VIEWS, variants: OUTER,
  },
  {
    concept: "hoodie-b", slug: "hoodie-tora-kamon-titik", name: "Hoodie Tora · Kamon & Titik", category: "hoodie", price: 449000, weightGrams: 650,
    description: "Hoodie fleece 330 gsm boxy oversize. Kamon api 虎 di dada, kanji 虎 raksasa dari titik halftone di punggung dengan kanji 虎火商店 vertikal. Satu seri dengan Kaos Honoo Stempel & Titik Api.",
    views: GARMENT_VIEWS, variants: OUTER,
  },
  {
    concept: "hoodie-c", slug: "hoodie-yami-tonal", name: "Hoodie Yami · Tonal", category: "hoodie", price: 429000, weightGrams: 650,
    description: "Hoodie fleece 330 gsm boxy oversize. Harimau hitam-doff samar di depan dengan 闇 putih kecil, ombak seigaiha tonal di punggung. Pasangan Kaos Oversize Yami.",
    views: GARMENT_VIEWS, variants: OUTER,
  },

  // ---------- Jaket ----------
  {
    concept: "jaket-a", slug: "jaket-zip-kumo", name: "Jaket Zip Kumo", category: "jaket", price: 499000, weightGrams: 700, featured: true,
    description: "Jaket zip berkerah, potongan lurus pendek, resleting dua arah. Belakang: TORAHO melengkung di atas harimau halftone dan 虎火; depan: logo kecil di dada kiri. Sablon 1 warna.",
    views: GARMENT_VIEWS, variants: OUTER,
  },
  {
    concept: "jaket-b", slug: "jaket-zip-kamon", name: "Jaket Zip Kamon", category: "jaket", price: 499000, weightGrams: 700,
    description: "Jaket zip berkerah dengan kamon api besar dan pita nama “TORAHO · KOLEKSI 01” di punggung, stempel hanko 火 di dada. Sablon 1 warna.",
    views: GARMENT_VIEWS, variants: OUTER,
  },
  {
    concept: "jaket-c", slug: "jaket-zip-honoo-bordir", name: "Jaket Zip Honoo · Bordir", category: "jaket", price: 549000, compareAtPrice: 599000, weightGrams: 720,
    description: "Jaket zip berkerah dengan bordir: kanji 火 besar di punggung bertulisan melengkung HONOO · 炎, kamon kecil di dada dan HONOO 炎 di lengan. Benang putih satin-stitch.",
    views: GARMENT_VIEWS, variants: OUTER,
  },

  // ---------- Merch ----------
  {
    concept: "stiker-a", slug: "stiker-set-die-cut", name: "Set Stiker Die-cut (6 pcs)", category: "merch", price: 35000, weightGrams: 20,
    description: "Enam stiker vinyl hitam tahan air dengan potongan mengikuti bentuk: harimau, kamon api, hanko 火, wordmark, halftone, dan 虎火商店 vertikal.",
    views: MERCH_VIEWS, variants: one(100),
  },
  {
    concept: "stiker-b", slug: "stiker-set-label-vintage", name: "Set Stiker Label Vintage", category: "merch", price: 35000, weightGrams: 20,
    description: "Stiker kertas krem bergaya label lama: tiket “ADMIT ONE TIGER”, segel “KUALITAS TERJAMIN”, label kirim dengan barcode & インドネシア製, dan strip TORAHO. Pas untuk segel kemasan.",
    views: MERCH_VIEWS, variants: one(100),
  },
  {
    concept: "kunci-a", slug: "gantungan-kunci-akrilik", name: "Gantungan Kunci Akrilik Harimau", category: "merch", price: 45000, weightGrams: 30,
    description: "Akrilik bening 5 mm dengan cetak UV harimau putih di panel hitam, ring besi black-nickel. Ukuran ± 6 × 7 cm.",
    views: MERCH_VIEWS, variants: one(40),
  },
  {
    concept: "kunci-b", slug: "gantungan-kunci-pvc-kamon", name: "Gantungan Kunci PVC Kamon", category: "merch", price: 39000, weightGrams: 30,
    description: "Karet PVC 2D lunak dengan motif kamon api 虎 timbul putih di atas hitam. Awet dan ringan, diameter ± 6 cm.",
    views: MERCH_VIEWS, variants: one(40),
  },
  {
    concept: "kunci-c", slug: "gantungan-kunci-omamori", name: "Omamori Toraho 御守", category: "merch", price: 59000, weightGrams: 25, featured: true,
    description: "Gantungan kunci bergaya omamori (jimat kain kuil Jepang): 御守 dan 虎火 bordir benang putih, tali simpul putih. Simbol keberanian harimau dan api.",
    views: MERCH_VIEWS, variants: one(30),
  },
  {
    concept: "pin-a", slug: "enamel-pin-kepala-harimau", name: "Enamel Pin Kepala Harimau", category: "merch", price: 55000, weightGrams: 20,
    description: "Hard enamel bulat 30 mm, garis logam black-nickel, isi enamel putih & hitam. Dua jarum dengan karet kupu-kupu.",
    views: MERCH_VIEWS, variants: one(40),
  },
  {
    concept: "pin-b", slug: "enamel-pin-kamon-api", name: "Enamel Pin Kamon Api", category: "merch", price: 55000, weightGrams: 20,
    description: "Hard enamel 32 mm berbentuk kamon api dengan 虎 di tengah, garis logam black-nickel yang tajam. Satu set dengan patch & jaket Kamon.",
    views: MERCH_VIEWS, variants: one(40),
  },
  {
    concept: "pin-c", slug: "enamel-pin-hanko-hi", name: "Enamel Pin Hanko 火 + Kartu", category: "merch", price: 49000, weightGrams: 20,
    description: "Pin stempel kotak 25 mm (enamel putih + hitam) dipasang di kartu kemasan hitam TORAHO: siap jadi hadiah.",
    views: MERCH_VIEWS, variants: one(40),
  },
  {
    concept: "patch-a", slug: "patch-cincin-harimau", name: "Patch Bordir Cincin Harimau", category: "merch", price: 59000, weightGrams: 30,
    description: "Patch bordir bulat ± 8 cm, tepi merrow putih, harimau dan TORAHO di tengah. Bisa disetrika atau dijahit.",
    views: MERCH_VIEWS, variants: one(30),
  },
  {
    concept: "patch-b", slug: "patch-kamon-api", name: "Patch Bordir Kamon Api", category: "merch", price: 59000, weightGrams: 30,
    description: "Patch bordir ± 8 cm: lambang kamon dengan 虎 dikelilingi delapan lidah api. Bisa disetrika atau dijahit.",
    views: MERCH_VIEWS, variants: one(30),
  },
  {
    concept: "patch-c", slug: "patch-perisai", name: "Patch Bordir Perisai", category: "merch", price: 65000, weightGrams: 30,
    description: "Patch bordir bentuk perisai bergaya varsity/klub motor dengan harimau dan pita nama TORAHO 虎火. ± 9 cm.",
    views: MERCH_VIEWS, variants: one(30),
  },
  {
    concept: "tote-a", slug: "tote-ukiyo-ombak", name: "Tote Ukiyo · Harimau di Atas Ombak", category: "merch", price: 129000, weightGrams: 250,
    description: "Tote bag kanvas 12oz hitam, sablon putih: harimau halftone muncul dari ombak seigaiha ala ukiyo-e. ± 38 × 42 cm.",
    views: MERCH_VIEWS, variants: one(20),
  },
  {
    concept: "tote-b", slug: "tote-kanji-raksasa", name: "Tote Kanji Raksasa 虎火", category: "merch", price: 129000, weightGrams: 250,
    description: "Tote bag kanvas 12oz natural dengan 虎火 vertikal besar dan harimau kecil di pojok, sablon hitam. ± 38 × 42 cm.",
    views: MERCH_VIEWS, variants: one(20),
  },
];

/** URL foto produk (relatif ke public/), urutan sesuai tampilan galeri. */
export function productImages(p: KoleksiProduct): string[] {
  return p.views.map((v) => `/products/koleksi-01/${p.slug}${v === "full" ? "" : `-${v}`}.webp`);
}
