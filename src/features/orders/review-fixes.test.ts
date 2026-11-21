import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder, type CheckoutInput } from "@/features/checkout/service";
import { handleMidtransNotification } from "@/features/payments/webhook";
import { makeOrder, makeProduct, orderOf, stockOf } from "@/test/factory";
import { advanceStatus, cancelOrder, markRefunded } from "./admin";

const KEY = "SB-Mid-server-REVIEW";
beforeAll(() => {
  process.env.MIDTRANS_SERVER_KEY = KEY;
});

function settlement(order: { code: string; total: number }) {
  const n = { order_id: order.code, transaction_id: `trx-${order.code}`, transaction_status: "settlement", status_code: "200", gross_amount: `${order.total}.00`, fraud_status: "accept" };
  return { ...n, signature_key: createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + KEY).digest("hex") };
}

const buyer = (lines: CheckoutInput["lines"]): CheckoutInput => ({
  lines,
  customerName: "Pembeli",
  phone: "081234567890",
  provinceCode: "JB",
  city: "Bandung",
  district: "Coblong",
  postalCode: "40132",
  addressLine: "Jl. Tes",
  paymentMethod: "MANUAL",
});

describe("I1: uang masuk untuk pesanan yang sudah batal harus tercatat", () => {
  it("settlement untuk pesanan BATAL → paidAt + catatan refund, dan bisa ditandai refund", async () => {
    const { order } = await makeOrder();
    await cancelOrder(order.id, "pembeli batal");
    const r = await handleMidtransNotification(settlement(order));
    expect(r.outcome).toBe("needs_action");
    const after = await orderOf(order.id);
    expect(after.status).toBe("BATAL");
    expect(after.paidAt).not.toBeNull();
    expect(after.adminNote).toContain("refund manual");
    expect(await markRefunded(order.id)).toEqual({ ok: true });
  });

  it("transfer manual dibatalkan saat menunggu verifikasi (ada bukti) → bisa ditandai refund", async () => {
    const { order } = await makeOrder({ paymentMethod: "MANUAL", set: { status: "MENUNGGU_VERIFIKASI" } });
    await prisma.paymentProof.create({ data: { orderId: order.id, url: "/uploads/x.png" } });
    await cancelOrder(order.id);
    expect(await markRefunded(order.id)).toEqual({ ok: true });
  });
});

describe("I2: transisi admin dicek ulang di dalam kunci", () => {
  it("advanceStatus menolak tujuan di luar alur kirim (mis. DIBAYAR dari MENUNGGU_BAYAR)", async () => {
    const { order } = await makeOrder();
    const r = await advanceStatus(order.id, "DIBAYAR" as never);
    expect(r.ok).toBe(false);
    expect((await orderOf(order.id)).status).toBe("MENUNGGU_BAYAR");
  });
});

describe("I3: checkout melepas dulu stok pesanan yang sudah kedaluwarsa", () => {
  it("unit terakhir yang ditahan pesanan kedaluwarsa bisa dibeli orang lain", async () => {
    const created = new Date("2026-02-01T00:00:00Z");
    const { variant, order } = await makeOrder({ stock: 1, qty: 1, now: created });
    expect(await stockOf(variant.id)).toBe(0);
    const r = await createOrder(buyer([{ variantId: variant.id, qty: 1 }]), new Date(created.getTime() + 30 * 3600_000));
    expect(r.ok).toBe(true);
    expect((await orderOf(order.id)).status).toBe("KEDALUWARSA");
    expect(await stockOf(variant.id)).toBe(0);
  });
});

describe("I4: urutan kunci stok konsisten (tanpa deadlock)", () => {
  it("banyak checkout bersamaan dengan urutan keranjang terbalik semuanya berhasil", async () => {
    const { variant: a } = await makeProduct({ stock: 100 });
    const { variant: b } = await makeProduct({ stock: 100 });
    const runs = Array.from({ length: 12 }, (_, i) =>
      createOrder(buyer(i % 2 ? [{ variantId: a.id, qty: 1 }, { variantId: b.id, qty: 1 }] : [{ variantId: b.id, qty: 1 }, { variantId: a.id, qty: 1 }])),
    );
    const results = await Promise.allSettled(runs);
    const failed = results.filter((r) => r.status === "rejected" || !r.value.ok);
    expect(failed).toHaveLength(0);
    expect(await stockOf(a.id)).toBe(88);
    expect(await stockOf(b.id)).toBe(88);
  });
});
