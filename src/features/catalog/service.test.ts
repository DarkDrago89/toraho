import { describe, expect, it } from "vitest";
import { getProductBySlug, getVariantsForCart, listProducts } from "./service";
import { makeCategory, makeProduct } from "@/test/factory";

describe("katalog publik", () => {
  it("menyembunyikan produk tersembunyi", async () => {
    const { product } = await makeProduct({ isVisible: false });
    expect(await getProductBySlug(product.slug)).toBeNull();
    const all = await listProducts({});
    expect(all.some((p) => p.slug === product.slug)).toBe(false);
  });

  it("menyembunyikan produk di kategori tersembunyi", async () => {
    const cat = await makeCategory({ isVisible: false });
    const { product } = await makeProduct({ categoryId: cat.id });
    expect(await getProductBySlug(product.slug)).toBeNull();
    expect((await listProducts({})).some((p) => p.slug === product.slug)).toBe(false);
  });

  it("menandai habis hanya jika semua varian stok 0", async () => {
    const cat = await makeCategory();
    const { product: habis } = await makeProduct({ categoryId: cat.id, variants: [{ label: "S", stock: 0 }, { label: "M", stock: 0 }] });
    const { product: ada } = await makeProduct({ categoryId: cat.id, variants: [{ label: "S", stock: 0 }, { label: "M", stock: 2 }] });
    const list = await listProducts({ categorySlug: cat.slug });
    expect(list.find((p) => p.slug === habis.slug)?.soldOut).toBe(true);
    expect(list.find((p) => p.slug === ada.slug)?.soldOut).toBe(false);
  });

  it("mengurutkan berdasarkan harga naik", async () => {
    const cat = await makeCategory();
    await makeProduct({ categoryId: cat.id, price: 300000 });
    await makeProduct({ categoryId: cat.id, price: 100000 });
    await makeProduct({ categoryId: cat.id, price: 200000 });
    const list = await listProducts({ categorySlug: cat.slug, sort: "harga-naik" });
    expect(list.map((p) => p.price)).toEqual([100000, 200000, 300000]);
  });

  it("detail memuat varian berurutan tanpa varian yang diarsipkan", async () => {
    const { product, variants } = await makeProduct({ variants: [{ label: "S", stock: 1 }, { label: "M", stock: 2 }] });
    const { prisma } = await import("@/lib/db");
    await prisma.variant.update({ where: { id: variants[0].id }, data: { isArchived: true } });
    const detail = await getProductBySlug(product.slug);
    expect(detail?.variants.map((v) => v.label)).toEqual(["M"]);
  });
});

describe("getVariantsForCart", () => {
  it("mengembalikan data server dan melaporkan varian yang tidak tersedia", async () => {
    const { variant, product } = await makeProduct({ price: 175000, stock: 4 });
    const { variant: hidden } = await makeProduct({ isVisible: false });
    const rows = await getVariantsForCart([variant.id, hidden.id, "tidak-ada"]);
    expect(rows.available).toHaveLength(1);
    expect(rows.available[0]).toMatchObject({ variantId: variant.id, price: 175000, stock: 4, slug: product.slug });
    expect(rows.missing.sort()).toEqual([hidden.id, "tidak-ada"].sort());
  });
});
