import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setShippingRates, updateSettings } from "@/features/settings/service";
import { makeProduct, stockOf } from "@/test/factory";
import { createOrder, type CheckoutInput } from "./service";

const NOW = new Date("2026-11-21T03:00:00Z");

function input(lines: CheckoutInput["lines"], over: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    lines,
    customerName: "Budi Santoso",
    phone: "+62 812-3456-7890",
    email: "",
    provinceCode: "JB",
    city: "Bandung",
    district: "Coblong",
    postalCode: "40132",
    addressLine: "Jl. Dago No. 1",
    paymentMethod: "MANUAL",
    ...over,
  };
}

beforeEach(async () => {
  await setShippingRates({ JB: 15000, PA: 0 });
  await updateSettings({ paymentWindowHours: 24 });
});

describe("createOrder", () => {
  it("menyalin harga dari server, menahan stok, dan menghitung total + ongkir", async () => {
    const { variant } = await makeProduct({ price: 179000, weightGrams: 220, stock: 5 });
    const r = await createOrder(input([{ variantId: variant.id, qty: 2 }]), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const order = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id }, include: { items: true } });
    expect(order).toMatchObject({
      status: "MENUNGGU_BAYAR",
      subtotal: 358000,
      shippingCost: 15000,
      total: 373000,
      weightGrams: 440,
      phone: "081234567890",
      email: null,
      stockHeld: true,
      paymentMethod: "MANUAL",
    });
    expect(order.paymentDeadline.toISOString()).toBe("2026-11-22T03:00:00.000Z");
    expect(order.items[0]).toMatchObject({ price: 179000, qty: 2, productName: "Produk Tes", variantLabel: "M" });
    expect(r.order.code).toMatch(/^TRH-261121-[2-9A-Z]{4}$/);
    expect(await stockOf(variant.id)).toBe(3);
  });

  it("Review Focus 1: dua checkout bersamaan untuk unit terakhir — hanya satu yang berhasil", async () => {
    const { variant } = await makeProduct({ name: "Sukajan Tora", stock: 1 });
    const results = await Promise.all([
      createOrder(input([{ variantId: variant.id, qty: 1 }]), NOW),
      createOrder(input([{ variantId: variant.id, qty: 1 }]), NOW),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const failed = results.find((r) => !r.ok);
    expect(failed && !failed.ok && failed.errors.join(" ")).toContain("Stok Sukajan Tora (M) tidak cukup");
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("Review Focus 3: item tidak tersedia ditolak per item dan stok item lain tidak berubah", async () => {
    const { variant: ok } = await makeProduct({ stock: 5 });
    const { variant: hidden } = await makeProduct({ name: "Kaos Lama", isVisible: false, stock: 5 });
    const r = await createOrder(
      input([
        { variantId: ok.id, qty: 1 },
        { variantId: hidden.id, qty: 1 },
        { variantId: "varian-hilang", qty: 1 },
      ]),
      NOW,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContain("Kaos Lama sudah tidak tersedia");
    expect(r.errors).toContain("Ada barang di tas yang sudah tidak dijual");
    expect(await stockOf(ok.id)).toBe(5);
    expect(await stockOf(hidden.id)).toBe(5);
  });

  it("stok kurang di salah satu baris membatalkan seluruh pesanan", async () => {
    const { variant: a } = await makeProduct({ stock: 5 });
    const { variant: b } = await makeProduct({ name: "Topi Ronin", stock: 1 });
    const r = await createOrder(input([{ variantId: a.id, qty: 2 }, { variantId: b.id, qty: 2 }]), NOW);
    expect(r.ok).toBe(false);
    expect(await stockOf(a.id)).toBe(5);
    expect(await stockOf(b.id)).toBe(1);
  });

  it("menolak provinsi tanpa tarif", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const r = await createOrder(input([{ variantId: variant.id, qty: 1 }], { provinceCode: "PA" }), NOW);
    expect(r).toEqual({ ok: false, errors: ["Pengiriman ke provinsi ini belum tersedia"] });
  });

  it("memvalidasi form", async () => {
    const r = await createOrder(input([], { customerName: " ", phone: "123", postalCode: "40" }), NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(
      expect.arrayContaining(["Nama wajib diisi", "Nomor HP/WA tidak valid", "Kode pos harus 5 angka", "Tas belanja kosong"]),
    );
  });

  it("menggabungkan baris ganda untuk varian yang sama", async () => {
    const { variant } = await makeProduct({ stock: 3 });
    const r = await createOrder(input([{ variantId: variant.id, qty: 2 }, { variantId: variant.id, qty: 2 }]), NOW);
    expect(r.ok).toBe(false);
    expect(await stockOf(variant.id)).toBe(3);
  });
});
