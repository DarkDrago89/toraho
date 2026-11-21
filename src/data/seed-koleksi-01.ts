import type { PrismaClient } from "@prisma/client";
import { KOLEKSI_01, productImages } from "./koleksi-01";

/** Produk contoh lama (gambar kanji placeholder) yang digantikan Koleksi 01: disembunyikan, tidak dihapus. */
export const LEGACY_PLACEHOLDER_SLUGS = [
  "sukajan-tora",
  "bomber-honoo",
  "coach-jacket-kumo",
  "kaos-honoo",
  "kaos-tora-kanji",
  "kaos-oversize-yami",
  "patch-kamon",
  "tote-bag-ukiyo",
  "topi-ronin",
];

const CATEGORIES = [
  { slug: "jaket", name: "Jaket", sortOrder: 0 },
  { slug: "kaos", name: "Kaos", sortOrder: 1 },
  { slug: "hoodie", name: "Hoodie", sortOrder: 2 },
  { slug: "merch", name: "Merch", sortOrder: 3 },
];

/**
 * Memasukkan 27 produk Koleksi 01. Idempoten:
 *  - produk yang belum ada dibuat lengkap (foto, varian, stok awal);
 *  - produk yang sudah ada TIDAK diubah sama sekali (harga/stok/foto mungkin sudah diatur admin);
 *  - kategori yang belum ada dibuat; placeholder lama disembunyikan.
 */
export async function seedKoleksi01(prisma: PrismaClient): Promise<{ created: number; existing: number; hidden: number }> {
  const catId: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
    catId[c.slug] = row.id;
  }

  let created = 0;
  let existing = 0;
  for (const p of KOLEKSI_01) {
    if (await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } })) {
      existing++;
      continue;
    }
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        categoryId: catId[p.category],
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        weightGrams: p.weightGrams,
        isVisible: true,
        isFeatured: p.featured ?? false,
        images: { create: productImages(p).map((url, i) => ({ url, sortOrder: i })) },
        variants: {
          create: p.variants.map((v, i) => ({
            label: v.label,
            stock: v.stock,
            sortOrder: i,
            sku: `${p.slug}-${v.label === "All size" ? "ALL" : v.label}`.toUpperCase(),
          })),
        },
      },
    });
    created++;
  }

  const hidden = await prisma.product.updateMany({
    where: { slug: { in: LEGACY_PLACEHOLDER_SLUGS }, isVisible: true },
    data: { isVisible: false, isFeatured: false },
  });

  return { created, existing, hidden: hidden.count };
}
