import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeOrder, orderOf, stockOf } from "@/test/factory";
import {
  advanceStatus,
  cancelOrder,
  confirmManualPayment,
  listOrders,
  markRefunded,
  rejectManualPayment,
  resolveNeedsAction,
} from "./admin";

const HOUR = 3600_000;

describe("konfirmasi & tolak transfer manual", () => {
  it("konfirmasi → DIBAYAR dengan paidAt", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL", set: { status: "MENUNGGU_VERIFIKASI" } });
    expect(await confirmManualPayment(order.id)).toEqual({ ok: true });
    const after = await orderOf(order.id);
    expect(after.status).toBe("DIBAYAR");
    expect(after.paidAt).not.toBeNull();
  });

  it("tolak wajib alasan; dengan alasan → MENUNGGU_BAYAR, deadline baru, stok tetap ditahan", async () => {
    const { order, variant } = await makeOrder({ paymentMethod: "MANUAL", stock: 5, qty: 2, set: { status: "MENUNGGU_VERIFIKASI" } });
    expect(await rejectManualPayment(order.id, "  ")).toEqual({ ok: false, error: "Alasan penolakan wajib diisi" });
    const now = new Date(Date.now() + 5 * HOUR);
    expect(await rejectManualPayment(order.id, "Nominal kurang", now)).toEqual({ ok: true });
    const after = await orderOf(order.id);
    expect(after).toMatchObject({ status: "MENUNGGU_BAYAR", rejectReason: "Nominal kurang", stockHeld: true });
    expect(after.paymentDeadline.getTime()).toBe(now.getTime() + 24 * HOUR);
    expect(await stockOf(variant.id)).toBe(3);
  });

  it("konfirmasi ditolak jika status bukan MENUNGGU_VERIFIKASI", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL" });
    expect(await confirmManualPayment(order.id)).toEqual({ ok: false, error: "Perubahan status tidak diizinkan" });
  });
});

describe("cancelOrder", () => {
  it("batal dari DIKEMAS mengembalikan stok", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 2, set: { status: "DIKEMAS", paidAt: new Date() } });
    expect(await cancelOrder(order.id, "Pembeli minta batal")).toEqual({ ok: true });
    expect(await orderOf(order.id)).toMatchObject({ status: "BATAL", stockHeld: false });
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("batal dari DIKIRIM ditolak", async () => {
    const { order } = await makeOrder({ set: { status: "DIKIRIM" } });
    expect(await cancelOrder(order.id)).toEqual({ ok: false, error: "Perubahan status tidak diizinkan" });
  });

  it("PERLU_TINDAKAN tanpa stok ditahan → batal tidak menambah stok", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 1, set: { status: "PERLU_TINDAKAN", stockHeld: false } });
    // stok 4 (ditahan checkout) — anggap sudah dilepas lalu terjual ke orang lain
    await cancelOrder(order.id);
    expect(await stockOf(variant.id)).toBe(4);
  });

  it("PERLU_TINDAKAN dengan stok ditahan (nominal tidak cocok) → batal mengembalikan stok", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 1, set: { status: "PERLU_TINDAKAN" } });
    await cancelOrder(order.id);
    expect(await stockOf(variant.id)).toBe(5);
  });
});

describe("advanceStatus", () => {
  it("DIKIRIM wajib resi", async () => {
    const { order } = await makeOrder({ set: { status: "DIKEMAS", paidAt: new Date() } });
    expect(await advanceStatus(order.id, "DIKIRIM", " ")).toEqual({ ok: false, error: "Nomor resi wajib diisi" });
    expect(await advanceStatus(order.id, "DIKIRIM", "JNE123")).toEqual({ ok: true });
    expect(await orderOf(order.id)).toMatchObject({ status: "DIKIRIM", trackingNumber: "JNE123" });
  });

  it("tidak bisa melompat DIBAYAR → DIKIRIM", async () => {
    const { order } = await makeOrder({ set: { status: "DIBAYAR", paidAt: new Date() } });
    expect((await advanceStatus(order.id, "DIKIRIM", "X")).ok).toBe(false);
  });
});

describe("resolveNeedsAction", () => {
  it("gagal saat stok kurang, berhasil setelah stok ditambah", async () => {
    const { order, variant } = await makeOrder({ stock: 1, qty: 1, set: { status: "PERLU_TINDAKAN", stockHeld: false, paidAt: new Date() } });
    // stok 0 setelah checkout; dilepas tanpa dikembalikan (terjual ke orang lain)
    expect(await stockOf(variant.id)).toBe(0);
    const fail = await resolveNeedsAction(order.id);
    expect(fail.ok).toBe(false);
    await prisma.variant.update({ where: { id: variant.id }, data: { stock: 3 } });
    expect(await resolveNeedsAction(order.id)).toEqual({ ok: true });
    expect(await orderOf(order.id)).toMatchObject({ status: "DIBAYAR", stockHeld: true });
    expect(await stockOf(variant.id)).toBe(2);
  });

  it("stok sudah ditahan (nominal tidak cocok) → langsung DIBAYAR tanpa memotong lagi", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 1, set: { status: "PERLU_TINDAKAN" } });
    expect(await resolveNeedsAction(order.id)).toEqual({ ok: true });
    expect(await stockOf(variant.id)).toBe(4);
    expect((await orderOf(order.id)).paidAt).not.toBeNull();
  });
});

describe("markRefunded & listOrders", () => {
  it("refund hanya untuk pesanan batal yang pernah lunas", async () => {
    const { order } = await makeOrder({ set: { status: "BATAL", paidAt: new Date() } });
    expect(await markRefunded(order.id)).toEqual({ ok: true });
    const { order: unpaid } = await makeOrder({ set: { status: "BATAL" } });
    expect((await markRefunded(unpaid.id)).ok).toBe(false);
  });

  it("PERLU_TINDAKAN dan MENUNGGU_VERIFIKASI tampil paling atas", async () => {
    const { order: a } = await makeOrder({ set: { status: "MENUNGGU_VERIFIKASI", paymentMethod: "MANUAL" } });
    const { order: b } = await makeOrder({ set: { status: "PERLU_TINDAKAN" } });
    const { order: c } = await makeOrder();
    const list = await listOrders({});
    const rank = (s: string) => (s === "PERLU_TINDAKAN" ? 0 : s === "MENUNGGU_VERIFIKASI" ? 1 : 2);
    const ranks = list.map((o) => rank(o.status));
    expect(ranks).toEqual([...ranks].sort((x, y) => x - y)); // grup prioritas tidak tercampur
    const idx = (id: string) => list.findIndex((o) => o.id === id);
    expect(idx(b.id)).toBeLessThan(idx(a.id));
    expect(idx(a.id)).toBeLessThan(idx(c.id));
  });
});
