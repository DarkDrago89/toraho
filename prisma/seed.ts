// Seed idempoten: aman dijalankan berulang kali (upsert).
//  - Selalu: akun admin + pengaturan & tarif ongkir default (jika belum ada).
//  - SEED_DEMO_PRODUCTS=true: kategori + produk contoh (untuk deployment demo/lokal).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { JAVA_PROVINCES, PROVINCES } from "../src/lib/shipping/provinces";

const prisma = new PrismaClient();

const SIZES = ["S", "M", "L", "XL", "XXL"];

type SeedProduct = {
  slug: string;
  name: string;
  category: "jaket" | "kaos" | "merch";
  price: number;
  compareAtPrice?: number;
  weightGrams: number;
  featured?: boolean;
  images: string[];
  description: string;
  /** Stok per ukuran S..XXL, atau satu angka untuk "All size". */
  stock: number[] | number;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "sukajan-tora",
    name: "Sukajan Tora",
    category: "jaket",
    price: 489000,
    compareAtPrice: 549000,
    weightGrams: 900,
    featured: true,
    images: ["/seed/sukajan-tora.svg", "/seed/sukajan-tora-2.svg"],
    description: "Jaket sukajan satin dengan bordir harimau 虎 di punggung. Furing quilted, ribbing tebal di leher dan lengan.",
    stock: [3, 8, 6, 2, 0],
  },
  {
    slug: "bomber-honoo",
    name: "Bomber Honoo",
    category: "jaket",
    price: 529000,
    weightGrams: 950,
    featured: true,
    images: ["/seed/bomber-honoo.svg"],
    description: "Bomber nilon hitam dengan motif api 炎 sablon tonal. Hangat tapi ringan untuk motoran malam.",
    stock: [2, 5, 5, 3, 1],
  },
  {
    slug: "coach-jacket-kumo",
    name: "Coach Jacket Kumo",
    category: "jaket",
    price: 399000,
    weightGrams: 700,
    images: ["/seed/coach-kumo.svg"],
    description: "Coach jacket tahan angin dengan motif awan 雲 tradisional. Kancing snap, saku samping.",
    stock: [4, 6, 6, 4, 2],
  },
  {
    slug: "kaos-honoo",
    name: "Kaos Honoo",
    category: "kaos",
    price: 179000,
    weightGrams: 220,
    featured: true,
    images: ["/seed/kaos-honoo.svg"],
    description: "Kaos katun combed 24s, sablon plastisol kanji 火 besar di dada. Potongan regular.",
    stock: [10, 15, 12, 8, 4],
  },
  {
    slug: "kaos-tora-kanji",
    name: "Kaos Tora Kanji",
    category: "kaos",
    price: 169000,
    weightGrams: 220,
    images: ["/seed/kaos-tora-kanji.svg"],
    description: "Kaos hitam dengan kaligrafi 虎 di punggung dan logo kecil di dada.",
    stock: [6, 10, 10, 6, 3],
  },
  {
    slug: "kaos-oversize-yami",
    name: "Kaos Oversize Yami",
    category: "kaos",
    price: 199000,
    compareAtPrice: 229000,
    weightGrams: 260,
    featured: true,
    images: ["/seed/kaos-oversize-yami.svg"],
    description: "Kaos oversize 16s heavyweight. Gelap, tebal, jatuh. Sablon 闇 tonal hitam di atas hitam.",
    stock: [5, 9, 9, 7, 5],
  },
  {
    slug: "patch-kamon",
    name: "Patch Kamon",
    category: "merch",
    price: 59000,
    weightGrams: 50,
    images: ["/seed/patch-kamon.svg"],
    description: "Patch bordir lambang keluarga bergaya kamon Toraho. Bisa disetrika atau dijahit.",
    stock: 40,
  },
  {
    slug: "tote-bag-ukiyo",
    name: "Tote Bag Ukiyo",
    category: "merch",
    price: 129000,
    weightGrams: 250,
    featured: true,
    images: ["/seed/tote-ukiyo.svg"],
    description: "Tote bag kanvas 12oz dengan ilustrasi ukiyo-e harimau di tengah ombak.",
    stock: 15,
  },
  {
    slug: "topi-ronin",
    name: "Topi Ronin",
    category: "merch",
    price: 149000,
    weightGrams: 150,
    images: ["/seed/topi-ronin.svg"],
    description: "Topi 6 panel dengan bordir 浪 di samping. Strap besi yang bisa diatur.",
    stock: 0,
  },
];

async function seedAdmin() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("SEED_ADMIN_PASSWORD belum diisi di .env");
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@toraho.test" },
    create: { email: "admin@toraho.test", name: "Admin Toraho", passwordHash },
    update: { passwordHash },
  });
}

async function seedSettings() {
  // Hanya diisi jika belum ada, agar tidak menimpa pengaturan yang sudah diubah admin.
  const exists = await prisma.setting.findUnique({ where: { key: "store" } });
  if (!exists) {
    await prisma.setting.create({
      data: {
        key: "store",
        value: {
          paymentWindowHours: 24,
          whatsapp: "081234567890",
          bankAccounts: [{ bank: "BCA", number: "1234567890", holder: "Toraho Store" }],
        },
      },
    });
  }
  if ((await prisma.shippingRate.count()) === 0) {
    const near = new Set(["BA", "LA", "SS", "SU", "SB", "RI", "JA", "BE", "BB", "KR", "AC"]);
    await prisma.shippingRate.createMany({
      data: PROVINCES.map((p) => ({
        provinceCode: p.code,
        cost: JAVA_PROVINCES.includes(p.code) ? 15000 : near.has(p.code) ? 25000 : 35000,
      })),
    });
  }
}

async function seedCatalog() {
  const cats = [
    { slug: "jaket", name: "Jaket", sortOrder: 0 },
    { slug: "kaos", name: "Kaos", sortOrder: 1 },
    { slug: "merch", name: "Merch", sortOrder: 2 },
  ];
  const catId: Record<string, string> = {};
  for (const c of cats) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
    catId[c.slug] = row.id;
  }

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue; // jangan timpa produk yang sudah diedit admin
    const variants = Array.isArray(p.stock)
      ? SIZES.map((label, i) => ({ label, stock: (p.stock as number[])[i], sku: `${p.slug}-${label}`.toUpperCase(), sortOrder: i }))
      : [{ label: "All size", stock: p.stock, sku: `${p.slug}-ALL`.toUpperCase(), sortOrder: 0 }];
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        categoryId: catId[p.category],
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        weightGrams: p.weightGrams,
        isFeatured: p.featured ?? false,
        description: p.description,
        images: { create: p.images.map((url, i) => ({ url, sortOrder: i })) },
        variants: { create: variants },
      },
    });
  }
}

async function main() {
  await seedAdmin();
  await seedSettings();
  if (process.env.SEED_DEMO_PRODUCTS === "true") await seedCatalog();
  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
