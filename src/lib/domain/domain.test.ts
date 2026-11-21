import { describe, expect, it } from "vitest";
import { canTransition, countsAsSold, ORDER_TRANSITIONS, type OrderStatus } from "./order-status";
import { computeTotals } from "./totals";
import { generateOrderCode } from "./order-code";

describe("canTransition", () => {
  const allowed: [OrderStatus, OrderStatus][] = [
    ["MENUNGGU_BAYAR", "MENUNGGU_VERIFIKASI"], // unggah bukti transfer
    ["MENUNGGU_BAYAR", "DIBAYAR"], // webhook Midtrans
    ["MENUNGGU_BAYAR", "KEDALUWARSA"],
    ["MENUNGGU_BAYAR", "BATAL"],
    ["MENUNGGU_BAYAR", "PERLU_TINDAKAN"], // nominal webhook tidak cocok
    ["MENUNGGU_VERIFIKASI", "DIBAYAR"], // admin konfirmasi
    ["MENUNGGU_VERIFIKASI", "MENUNGGU_BAYAR"], // admin tolak bukti
    ["MENUNGGU_VERIFIKASI", "BATAL"],
    ["DIBAYAR", "DIKEMAS"],
    ["DIBAYAR", "BATAL"],
    ["DIKEMAS", "DIKIRIM"],
    ["DIKEMAS", "BATAL"],
    ["DIKIRIM", "SELESAI"],
    ["KEDALUWARSA", "DIBAYAR"], // bayar telat, stok masih ada
    ["KEDALUWARSA", "PERLU_TINDAKAN"], // bayar telat, stok habis
    ["PERLU_TINDAKAN", "DIBAYAR"], // admin selesaikan
    ["PERLU_TINDAKAN", "BATAL"],
  ];
  it.each(allowed)("%s → %s diizinkan", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  const forbidden: [OrderStatus, OrderStatus][] = [
    ["DIKIRIM", "BATAL"], // retur bukan sasaran tahap 1
    ["SELESAI", "DIBAYAR"],
    ["DIBAYAR", "MENUNGGU_BAYAR"], // status tidak pernah mundur setelah lunas
    ["BATAL", "DIBAYAR"],
    ["MENUNGGU_VERIFIKASI", "KEDALUWARSA"], // bukti yang sudah diunggah tidak kedaluwarsa otomatis
    ["DIBAYAR", "DIKIRIM"], // harus dikemas dulu
  ];
  it.each(forbidden)("%s → %s ditolak", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("status akhir tidak punya transisi", () => {
    expect(ORDER_TRANSITIONS.SELESAI).toEqual([]);
    expect(ORDER_TRANSITIONS.BATAL).toEqual([]);
  });
});

describe("countsAsSold", () => {
  it("menghitung pesanan yang sudah lunas", () => {
    expect(countsAsSold("DIKEMAS")).toBe(true);
    expect(countsAsSold("SELESAI")).toBe(true);
  });
  it("tidak menghitung pesanan bermasalah atau belum lunas", () => {
    expect(countsAsSold("PERLU_TINDAKAN")).toBe(false);
    expect(countsAsSold("MENUNGGU_VERIFIKASI")).toBe(false);
    expect(countsAsSold("BATAL")).toBe(false);
  });
});

describe("computeTotals", () => {
  it("menjumlahkan subtotal, ongkir, dan berat", () => {
    expect(
      computeTotals(
        [
          { price: 489000, qty: 2, weightGrams: 900 },
          { price: 59000, qty: 1, weightGrams: 50 },
        ],
        15000,
      ),
    ).toEqual({ subtotal: 1037000, shippingCost: 15000, total: 1052000, weightGrams: 1850 });
  });
});

describe("generateOrderCode", () => {
  it("memakai tanggal WIB dan alfabet tanpa huruf/angka ambigu", () => {
    expect(generateOrderCode(new Date("2026-11-21T10:00:00+07:00"), () => 0)).toBe("TRH-261121-2222");
  });
  it("tanggal mengikuti WIB walau UTC masih hari sebelumnya", () => {
    expect(generateOrderCode(new Date("2026-11-21T18:00:00Z"), () => 0)).toBe("TRH-261122-2222");
  });
});
