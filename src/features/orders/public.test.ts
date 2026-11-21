import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { validateImageUpload } from "@/lib/storage";
import type { FileStorage } from "@/lib/storage/types";
import { makeOrder, orderOf } from "@/test/factory";
import { getOrderForBuyer, submitPaymentProof } from "./service";

const MB = 1024 * 1024;
const png = (size = 1000) => ({ name: "bukti.png", type: "image/png", size, bytes: Buffer.alloc(Math.min(size, 10)) });

function fakeStorage(): FileStorage & { put: ReturnType<typeof vi.fn> } {
  return { put: vi.fn(async (key: string) => `/uploads/${key}`) };
}

describe("validateImageUpload", () => {
  it("Review Focus 4: menolak bukan gambar dan file > 5 MB", () => {
    expect(validateImageUpload({ type: "application/pdf", size: 1000 })).toBe("Bukti harus berupa gambar JPG, PNG, atau WEBP");
    // Batas 4 MB: Vercel menolak body request > 4,5 MB, jadi 5 MB tidak pernah bisa sampai di produksi.
    expect(validateImageUpload({ type: "image/png", size: 4 * MB + 1 })).toBe("Ukuran maksimal 4 MB");
    expect(validateImageUpload({ type: "image/png", size: 0 })).toBe("File kosong");
    expect(validateImageUpload({ type: "image/webp", size: 4 * MB })).toBeNull();
  });
});

describe("submitPaymentProof", () => {
  it("Review Focus 4: file tidak valid tidak disimpan dan status tidak berubah", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL" });
    const storage = fakeStorage();
    const r = await submitPaymentProof(order.code, "081234567890", { ...png(), type: "application/pdf" }, new Date(), storage);
    expect(r).toEqual({ ok: false, error: "Bukti harus berupa gambar JPG, PNG, atau WEBP" });
    expect(storage.put).not.toHaveBeenCalled();
    expect(await prisma.paymentProof.count({ where: { orderId: order.id } })).toBe(0);
    expect((await orderOf(order.id)).status).toBe("MENUNGGU_BAYAR");
  });

  it("unggah valid → MENUNGGU_VERIFIKASI, alasan tolak lama dihapus", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL", set: { rejectReason: "Buram" } });
    const storage = fakeStorage();
    const r = await submitPaymentProof(order.code, "+6281234567890", png(), new Date(), storage);
    expect(r).toEqual({ ok: true });
    expect(storage.put).toHaveBeenCalledOnce();
    const after = await orderOf(order.id);
    expect(after).toMatchObject({ status: "MENUNGGU_VERIFIKASI", rejectReason: null });
    expect(await prisma.paymentProof.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("menolak unggah setelah batas waktu", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL" });
    const late = new Date(order.paymentDeadline.getTime() + 1000);
    const r = await submitPaymentProof(order.code, "081234567890", png(), late, fakeStorage());
    expect(r).toEqual({ ok: false, error: "Batas waktu pembayaran sudah lewat" });
  });

  it("menolak pesanan Midtrans dan HP yang salah", async () => {
    const { order } = await makeOrder({ paymentMethod: "MIDTRANS" });
    expect((await submitPaymentProof(order.code, "081234567890", png(), new Date(), fakeStorage())).ok).toBe(false);
    const { order: manual } = await makeOrder({ paymentMethod: "MANUAL" });
    expect(await submitPaymentProof(manual.code, "089999999999", png(), new Date(), fakeStorage())).toEqual({
      ok: false,
      error: "Pesanan tidak ditemukan",
    });
  });
});

describe("getOrderForBuyer", () => {
  it("mengembalikan pesanan jika kode + HP cocok (format HP bebas)", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL", qty: 2, price: 179000 });
    const v = await getOrderForBuyer(order.code.toLowerCase(), "+62 812-3456-7890");
    expect(v).toMatchObject({ code: order.code, status: "MENUNGGU_BAYAR", total: 373000, paymentMethod: "MANUAL" });
    expect(v?.items[0]).toMatchObject({ qty: 2, price: 179000 });
  });

  it("null jika HP salah", async () => {
    const { order } = await makeOrder();
    expect(await getOrderForBuyer(order.code, "089999999999")).toBeNull();
  });
});
