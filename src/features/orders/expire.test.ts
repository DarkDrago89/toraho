import { describe, expect, it } from "vitest";
import { makeOrder, orderOf, stockOf } from "@/test/factory";
import { expireStaleOrders } from "./service";

const HOUR = 3600_000;

describe("expireStaleOrders", () => {
  it("pesanan lewat batas waktu → KEDALUWARSA dan stok kembali", async () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const { order, variant } = await makeOrder({ stock: 5, qty: 2, now: created });
    expect(await stockOf(variant.id)).toBe(3);
    await expireStaleOrders(new Date(created.getTime() + 25 * HOUR));
    expect(await orderOf(order.id)).toMatchObject({ status: "KEDALUWARSA", stockHeld: false });
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("belum lewat batas waktu → tidak berubah", async () => {
    const created = new Date();
    const { order } = await makeOrder({ now: created });
    await expireStaleOrders(new Date(created.getTime() + 2 * HOUR));
    expect((await orderOf(order.id)).status).toBe("MENUNGGU_BAYAR");
  });

  it("MENUNGGU_VERIFIKASI tidak pernah kedaluwarsa otomatis", async () => {
    const created = new Date("2026-01-02T00:00:00Z");
    const { order, variant } = await makeOrder({ paymentMethod: "MANUAL", now: created, set: { status: "MENUNGGU_VERIFIKASI" } });
    await expireStaleOrders(new Date(created.getTime() + 100 * HOUR));
    expect((await orderOf(order.id)).status).toBe("MENUNGGU_VERIFIKASI");
    expect(await stockOf(variant.id)).toBe(4);
  });

  it("dipanggil dua kali, stok hanya kembali sekali", async () => {
    const created = new Date("2026-01-03T00:00:00Z");
    const { variant } = await makeOrder({ stock: 5, qty: 1, now: created });
    const later = new Date(created.getTime() + 30 * HOUR);
    await expireStaleOrders(later);
    await expireStaleOrders(later);
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("bisa dibatasi ke satu pesanan", async () => {
    const created = new Date("2026-01-04T00:00:00Z");
    const { order: a } = await makeOrder({ now: created });
    const { order: b } = await makeOrder({ now: created });
    const n = await expireStaleOrders(new Date(created.getTime() + 30 * HOUR), a.id);
    expect(n).toBe(1);
    expect((await orderOf(a.id)).status).toBe("KEDALUWARSA");
    expect((await orderOf(b.id)).status).toBe("MENUNGGU_BAYAR");
  });
});
