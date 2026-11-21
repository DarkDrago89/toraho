import { describe, expect, it } from "vitest";
import { addLine, parseCart, removeLine, setQty, type CartLine } from "./cart-store";

describe("cart-store", () => {
  it("menambah varian yang sama menjumlahkan qty", () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, "v1", 1);
    lines = addLine(lines, "v1", 2);
    lines = addLine(lines, "v2", 1);
    expect(lines).toEqual([
      { variantId: "v1", qty: 3 },
      { variantId: "v2", qty: 1 },
    ]);
  });

  it("setQty 0 menghapus baris", () => {
    expect(setQty([{ variantId: "v1", qty: 2 }], "v1", 0)).toEqual([]);
    expect(setQty([{ variantId: "v1", qty: 2 }], "v1", 5)).toEqual([{ variantId: "v1", qty: 5 }]);
  });

  it("removeLine menghapus varian", () => {
    expect(removeLine([{ variantId: "v1", qty: 2 }, { variantId: "v2", qty: 1 }], "v1")).toEqual([{ variantId: "v2", qty: 1 }]);
  });

  it("parseCart mengabaikan data rusak", () => {
    expect(parseCart("{rusak")).toEqual([]);
    expect(parseCart(null)).toEqual([]);
    expect(parseCart(JSON.stringify([{ variantId: "v1", qty: 2 }, { variantId: 5 }, { variantId: "v2", qty: -1 }, { variantId: "v3", qty: 1.5 }]))).toEqual([
      { variantId: "v1", qty: 2 },
    ]);
  });
});
