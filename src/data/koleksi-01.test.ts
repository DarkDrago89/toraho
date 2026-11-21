import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KOLEKSI_01, productImages } from "./koleksi-01";

const CATEGORIES = ["jaket", "kaos", "hoodie", "merch"];

describe("data Koleksi 01", () => {
  it("berisi 27 produk dengan slug & konsep unik", () => {
    expect(KOLEKSI_01).toHaveLength(27);
    expect(new Set(KOLEKSI_01.map((p) => p.slug)).size).toBe(27);
    expect(new Set(KOLEKSI_01.map((p) => p.concept)).size).toBe(27);
  });

  it("setiap produk punya data jual yang sah", () => {
    for (const p of KOLEKSI_01) {
      expect(CATEGORIES, p.slug).toContain(p.category);
      expect(p.price, p.slug).toBeGreaterThan(0);
      expect(Number.isInteger(p.price), p.slug).toBe(true);
      expect(p.weightGrams, p.slug).toBeGreaterThan(0);
      if (p.compareAtPrice != null) expect(p.compareAtPrice, p.slug).toBeGreaterThan(p.price);
      expect(p.description.length, p.slug).toBeGreaterThan(40);
      expect(p.variants.length, p.slug).toBeGreaterThan(0);
      for (const v of p.variants) expect(v.stock, `${p.slug} ${v.label}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("pakaian punya ukuran S–XXL dan foto depan + belakang; merch satu varian All size", () => {
    for (const p of KOLEKSI_01) {
      if (p.category === "merch") {
        expect(p.variants.map((v) => v.label), p.slug).toEqual(["All size"]);
        expect(p.views, p.slug).toEqual(["full"]);
      } else {
        expect(p.variants.map((v) => v.label), p.slug).toEqual(["S", "M", "L", "XL", "XXL"]);
        expect(p.views, p.slug).toEqual(["depan", "belakang"]);
      }
    }
  });

  it("semua foto produk yang dirujuk ada di public/", () => {
    for (const p of KOLEKSI_01) {
      for (const url of productImages(p)) {
        expect(existsSync(path.join(process.cwd(), "public", url)), url).toBe(true);
      }
    }
  });
});
