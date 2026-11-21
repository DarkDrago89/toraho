import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeCategory, makeOrder, makeProduct, stockOf, uid } from "@/test/factory";
import { deleteCategory, getAdminProduct, listAdminProducts, saveCategory, saveProduct, type ProductInput } from "./service";

async function base(over: Partial<ProductInput> = {}): Promise<ProductInput> {
  const cat = await makeCategory();
  const s = uid("sku");
  return {
    categoryId: cat.id,
    name: "Sukajan Tes",
    description: "Deskripsi",
    price: 489000,
    compareAtPrice: null,
    weightGrams: 900,
    isVisible: true,
    isFeatured: false,
    variants: [
      { label: "M", sku: `${s}-M`, stock: 3 },
      { label: "L", sku: `${s}-L`, stock: 2 },
    ],
    imageUrls: ["/seed/sukajan-tora.svg"],
    ...over,
  };
}

describe("saveCategory / deleteCategory", () => {
  it("slug dibuat otomatis dan unik", async () => {
    const name = `Aksesoris ${uid()}`;
    const a = await saveCategory({ name, isVisible: true, sortOrder: 5 });
    const b = await saveCategory({ name, isVisible: true, sortOrder: 6 });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.category.slug).toBe(`${a.category.slug}-2`);
  });

  it("menolak hapus kategori yang masih berisi produk", async () => {
    const r = await saveProduct(await base());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const product = await prisma.product.findUniqueOrThrow({ where: { id: r.id } });
    expect(await deleteCategory(product.categoryId)).toEqual({ ok: false, error: "Kategori masih berisi produk" });
    const empty = await makeCategory();
    expect(await deleteCategory(empty.id)).toEqual({ ok: true });
  });
});

describe("saveProduct", () => {
  it("membuat produk dengan slug unik, varian, dan foto berurutan", async () => {
    const input = await base({ name: "Kaos Kembar" });
    const a = await saveProduct(input);
    const b = await saveProduct({ ...input, variants: input.variants.map((v) => ({ ...v, sku: v.sku + "-B" })) });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const pb = await prisma.product.findUniqueOrThrow({ where: { id: b.id }, include: { variants: true, images: true } });
    expect(pb.slug).toMatch(/^kaos-kembar-\d+$/);
    expect(pb.variants).toHaveLength(2);
    expect(pb.images[0].url).toBe("/seed/sukajan-tora.svg");
  });

  it("menolak harga coret yang tidak lebih tinggi", async () => {
    const r = await saveProduct(await base({ compareAtPrice: 489000 }));
    expect(r).toEqual({ ok: false, errors: ["Harga coret harus lebih tinggi dari harga jual"] });
  });

  it("menolak SKU duplikat (di form maupun di database)", async () => {
    const input = await base();
    const dupInForm = await saveProduct({ ...input, variants: [input.variants[0], { ...input.variants[1], sku: input.variants[0].sku }] });
    expect(dupInForm.ok).toBe(false);
    await saveProduct(input);
    const dupInDb = await saveProduct({ ...(await base()), variants: [{ label: "S", sku: input.variants[0].sku, stock: 1 }] });
    expect(dupInDb).toEqual({ ok: false, errors: [`SKU ${input.variants[0].sku} sudah dipakai produk lain`] });
  });

  it("validasi angka dan minimal satu varian", async () => {
    const r = await saveProduct(await base({ price: 0, weightGrams: 0, variants: [] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(expect.arrayContaining(["Harga harus lebih dari 0", "Berat harus lebih dari 0", "Minimal satu varian/ukuran"]));
  });

  it("varian yang sudah pernah dipesan diarsipkan, bukan dihapus; yang belum dihapus", async () => {
    const { product, variant } = await makeOrder({ stock: 5 });
    const full = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true, images: true } });
    const extra = await prisma.variant.create({ data: { productId: product.id, label: "XL", sku: uid("SKU"), stock: 1 } });

    const r = await saveProduct({
      id: product.id,
      categoryId: full.categoryId,
      name: full.name,
      description: "",
      price: full.price,
      compareAtPrice: null,
      weightGrams: full.weightGrams,
      isVisible: true,
      isFeatured: false,
      variants: [{ label: "S", sku: uid("SKU"), stock: 4 }], // M (dipesan) dan XL (belum) dihapus dari form
      imageUrls: [],
    });
    expect(r.ok).toBe(true);
    const ordered = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(ordered).toMatchObject({ isArchived: true, stock: 0 });
    expect(await prisma.variant.findUnique({ where: { id: extra.id } })).toBeNull();
  });

  it("mengubah stok varian yang ada lewat id", async () => {
    const created = await saveProduct(await base());
    if (!created.ok) throw new Error();
    const v = await prisma.variant.findMany({ where: { productId: created.id }, orderBy: { sortOrder: "asc" } });
    const input = await base();
    const r = await saveProduct({
      ...input,
      id: created.id,
      variants: v.map((x) => ({ id: x.id, label: x.label, sku: x.sku, stock: 10, baseStock: x.stock })),
    });
    expect(r.ok).toBe(true);
    const after = await prisma.variant.findMany({ where: { productId: created.id } });
    expect(after.map((x) => x.stock)).toEqual([10, 10]);
  });
});

describe("saveProduct: stok tidak boleh menimpa stok yang sudah ditahan pesanan (review C2)", () => {
  async function editInput(productId: string, stockOverride: (v: { id: string; label: string; sku: string; stock: number }) => { stock: number; baseStock: number }) {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: true } });
    return {
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: "deskripsi baru",
      price: p.price,
      compareAtPrice: null,
      weightGrams: p.weightGrams,
      isVisible: true,
      isFeatured: false,
      variants: p.variants.map((v) => ({ id: v.id, label: v.label, sku: v.sku, ...stockOverride(v) })),
      imageUrls: [],
    };
  }

  it("form basi (dibuka sebelum pesanan masuk) ditolak dan stok tidak berubah", async () => {
    const { product, variant } = await makeProduct({ stock: 1 });
    // Admin membuka form saat stok 1…
    const stale = await editInput(product.id, () => ({ stock: 1, baseStock: 1 }));
    // …lalu pembeli checkout unit itu (stok jadi 0, ditahan).
    await prisma.variant.update({ where: { id: variant.id }, data: { stock: 0 } });
    const r = await saveProduct(stale);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toContain("Stok M berubah sejak halaman dibuka");
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("form segar menyimpan stok baru", async () => {
    const { product, variant } = await makeProduct({ stock: 3 });
    const r = await saveProduct(await editInput(product.id, () => ({ stock: 8, baseStock: 3 })));
    expect(r.ok).toBe(true);
    expect(await stockOf(variant.id)).toBe(8);
  });
});

describe("getAdminProduct", () => {
  it("menampilkan jumlah unit yang sedang ditahan pesanan per varian", async () => {
    const { product, variant } = await makeOrder({ stock: 5, qty: 2 });
    const p = await getAdminProduct(product.id);
    expect(p?.variants.find((v) => v.id === variant.id)).toMatchObject({ stock: 3, held: 2 });
  });
});

describe("listAdminProducts", () => {
  it("menghitung terjual hanya dari pesanan lunas", async () => {
    const { product, order } = await makeOrder({ qty: 2 });
    let row = (await listAdminProducts({ q: product.slug })).find((p) => p.id === product.id);
    expect(row?.sold).toBe(0);
    await prisma.order.update({ where: { id: order.id }, data: { status: "DIBAYAR", paidAt: new Date() } });
    row = (await listAdminProducts({})).find((p) => p.id === product.id);
    expect(row).toMatchObject({ sold: 2, totalStock: 3 });
  });
});
