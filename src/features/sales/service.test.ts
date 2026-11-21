import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeOrder } from "@/test/factory";
import { getLowStock, getSalesReport, resolvePeriod } from "./service";

/** Rentang hari unik di masa lalu agar tidak tercampur data tes lain di database bersama. */
function day(y: number, m: number, d: number, h = 12) {
  return new Date(Date.UTC(y, m - 1, d, h - 7)); // jam WIB
}

// Tes di file ini memakai tanggal lunas sebelum 2020; bersihkan sisa run sebelumnya agar bisa diulang.
beforeAll(async () => {
  await prisma.order.deleteMany({ where: { paidAt: { lt: new Date("2020-01-01T00:00:00Z") } } });
});

describe("getSalesReport", () => {
  it("hanya menghitung status lunas di dalam rentang; omzet tanpa ongkir", async () => {
    const paid = day(2015, 3, 10);
    const mk = (status: string, qty: number, at = paid) =>
      makeOrder({ qty, price: 100000, stock: 10, set: { status: status as never, paidAt: at } });

    await mk("DIBAYAR", 2);
    await mk("SELESAI", 1);
    await mk("BATAL", 3); // dibatalkan setelah lunas
    await mk("MENUNGGU_VERIFIKASI", 4);
    await mk("PERLU_TINDAKAN", 5);
    await mk("DIBAYAR", 7, day(2015, 3, 20)); // di luar rentang

    const r = await getSalesReport({ from: day(2015, 3, 10, 0), to: day(2015, 3, 11, 0) });
    expect(r.orders).toBe(2);
    expect(r.units).toBe(3);
    expect(r.revenue).toBe(300000); // ongkir 2×15.000 tidak termasuk
    expect(r.avgOrder).toBe(150000);
    expect(r.daily).toEqual([{ date: "2015-03-10", revenue: 300000 }]);
    expect(r.byProduct.reduce((n, p) => n + p.units, 0)).toBe(3);
    expect(r.byCategory.reduce((n, c) => n + c.revenue, 0)).toBe(300000);
    expect(r.byVariant.every((v) => v.variantLabel === "M")).toBe(true);
  });

  it("rentang kosong → nol, bukan NaN", async () => {
    const r = await getSalesReport({ from: day(2001, 1, 1, 0), to: day(2001, 1, 2, 0) });
    expect(r).toMatchObject({ revenue: 0, orders: 0, units: 0, avgOrder: 0, byProduct: [] });
    expect(r.daily).toEqual([{ date: "2001-01-01", revenue: 0 }]);
  });

  it("harian mengisi hari tanpa penjualan dengan 0 dan memakai tanggal WIB", async () => {
    // 23:30 WIB tgl 5 = 16:30 UTC tgl 5 → tetap tanggal 5 WIB
    await makeOrder({ qty: 1, price: 50000, set: { status: "DIBAYAR", paidAt: new Date(Date.UTC(2016, 4, 5, 16, 30)) } });
    const r = await getSalesReport({ from: day(2016, 5, 4, 0), to: day(2016, 5, 7, 0) });
    expect(r.daily).toEqual([
      { date: "2016-05-04", revenue: 0 },
      { date: "2016-05-05", revenue: 50000 },
      { date: "2016-05-06", revenue: 0 },
    ]);
  });
});

describe("getLowStock", () => {
  it("mendaftar varian aktif dengan stok ≤ batas", async () => {
    const { variant } = await makeOrder({ stock: 3, qty: 1 }); // sisa 2
    const low = await getLowStock(3, 10_000);
    expect(low.some((v) => v.variantId === variant.id && v.stock === 2)).toBe(true);
    await prisma.variant.update({ where: { id: variant.id }, data: { isArchived: true } });
    expect((await getLowStock(3, 10_000)).some((v) => v.variantId === variant.id)).toBe(false);
  });
});

describe("resolvePeriod", () => {
  const now = new Date("2026-11-21T20:00:00Z"); // 22/11 03:00 WIB
  it("default 30 hari, berakhir di akhir hari ini (WIB)", () => {
    const p = resolvePeriod(undefined, now);
    expect(p.to.toISOString()).toBe("2026-11-22T17:00:00.000Z");
    expect(p.from.toISOString()).toBe("2026-10-23T17:00:00.000Z");
  });
  it("bulan ini mulai tanggal 1 WIB", () => {
    expect(resolvePeriod("bulan", now).from.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });
  it("rentang sendiri inklusif; input tidak valid kembali ke default", () => {
    const p = resolvePeriod("rentang", now, { dari: "2026-11-01", sampai: "2026-11-02" });
    expect([p.from.toISOString(), p.to.toISOString()]).toEqual(["2026-10-31T17:00:00.000Z", "2026-11-02T17:00:00.000Z"]);
    expect(resolvePeriod("rentang", now, { dari: "x", sampai: "2026-11-02" }).label).toBe("30 hari terakhir");
    expect(resolvePeriod("rentang", now, { dari: "2026-11-05", sampai: "2026-11-01" }).label).toBe("30 hari terakhir");
  });
});
