import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { KOLEKSI_01 } from "./koleksi-01";
import { LEGACY_PLACEHOLDER_SLUGS, seedKoleksi01 } from "./seed-koleksi-01";

const slugs = KOLEKSI_01.map((p) => p.slug);

beforeAll(async () => {
  // Database tes: mulai dari keadaan bersih untuk produk Koleksi 01 (riwayat pesanan tes lain tidak tersentuh).
  await prisma.product.deleteMany({ where: { slug: { in: slugs }, variants: { none: { orderItems: { some: {} } } } } });
  // Placeholder lama yang perlu disembunyikan.
  const cat = await prisma.category.upsert({ where: { slug: "kaos" }, create: { slug: "kaos", name: "Kaos" }, update: {} });
  await prisma.product.upsert({
    where: { slug: LEGACY_PLACEHOLDER_SLUGS[0] },
    create: { slug: LEGACY_PLACEHOLDER_SLUGS[0], name: "Placeholder", categoryId: cat.id, price: 1000, weightGrams: 100, isVisible: true },
    update: { isVisible: true },
  });
});

describe("seedKoleksi01", () => {
  it("membuat 27 produk lengkap dengan kategori Hoodie, foto, dan varian", async () => {
    const r = await seedKoleksi01(prisma);
    expect(r.created + r.existing).toBe(27);

    const hoodie = await prisma.category.findUnique({ where: { slug: "hoodie" } });
    expect(hoodie?.isVisible).toBe(true);

    const p = await prisma.product.findUniqueOrThrow({
      where: { slug: "hoodie-tora-stensil" },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } } },
    });
    expect(p).toMatchObject({ price: 429000, isVisible: true, isFeatured: true });
    expect(p.category.slug).toBe("hoodie");
    expect(p.images.map((i) => i.url)).toEqual([
      "/products/koleksi-01/hoodie-tora-stensil-depan.webp",
      "/products/koleksi-01/hoodie-tora-stensil-belakang.webp",
    ]);
    expect(p.variants.map((v) => v.label)).toEqual(["S", "M", "L", "XL", "XXL"]);
    expect(p.variants[0].sku).toBe("HOODIE-TORA-STENSIL-S");
  });

  it("menyembunyikan produk placeholder lama (tidak menghapus)", async () => {
    const old = await prisma.product.findUnique({ where: { slug: LEGACY_PLACEHOLDER_SLUGS[0] } });
    expect(old?.isVisible).toBe(false);
  });

  it("aman dijalankan ulang: tidak menduplikasi dan tidak menimpa stok yang diubah admin", async () => {
    const v = await prisma.variant.findFirstOrThrow({ where: { product: { slug: "kaos-tora-stensil" }, label: "M" } });
    await prisma.variant.update({ where: { id: v.id }, data: { stock: 77 } });

    const r = await seedKoleksi01(prisma);
    expect(r.created).toBe(0);
    expect(await prisma.product.count({ where: { slug: { in: slugs } } })).toBe(27);
    expect((await prisma.variant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(77);
    expect(await prisma.productImage.count({ where: { product: { slug: "kaos-tora-stensil" } } })).toBe(2);
  });
});
