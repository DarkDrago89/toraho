import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeOrder, orderOf, stockOf } from "@/test/factory";
import { handleMidtransNotification, type MidtransNotification } from "./webhook";

const KEY = "SB-Mid-server-WEBHOOK";
beforeAll(() => {
  process.env.MIDTRANS_SERVER_KEY = KEY;
});

function notif(
  order: { code: string; total: number },
  transaction_status: string,
  over: Partial<MidtransNotification> = {},
): MidtransNotification {
  const status_code = over.status_code ?? (transaction_status === "pending" ? "201" : transaction_status === "settlement" ? "200" : "202");
  const gross_amount = over.gross_amount ?? `${order.total}.00`;
  const n = {
    order_id: order.code,
    transaction_id: over.transaction_id ?? `trx-${order.code}`,
    transaction_status,
    status_code,
    gross_amount,
    payment_type: "qris",
    fraud_status: "accept",
    ...over,
  };
  return {
    ...n,
    signature_key: over.signature_key ?? createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + KEY).digest("hex"),
  };
}

describe("handleMidtransNotification", () => {
  it("settlement → DIBAYAR dan paidAt terisi", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 2 });
    const r = await handleMidtransNotification(notif(order, "settlement"));
    expect(r).toEqual({ status: 200, outcome: "paid" });
    const after = await orderOf(order.id);
    expect(after.status).toBe("DIBAYAR");
    expect(after.paidAt).not.toBeNull();
    expect(await stockOf(variant.id)).toBe(3); // ditahan saat checkout, tidak dikurangi lagi
  });

  it("Review Focus 2: settlement ganda lalu pending → tetap DIBAYAR, stok berubah sekali, satu event", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 1 });
    await handleMidtransNotification(notif(order, "settlement"));
    const dup = await handleMidtransNotification(notif(order, "settlement"));
    const late = await handleMidtransNotification(notif(order, "pending", { transaction_id: `trx-${order.code}` }));
    expect(dup.outcome).toBe("ignored");
    expect(late.outcome).toBe("ignored");
    expect((await orderOf(order.id)).status).toBe("DIBAYAR");
    expect(await stockOf(variant.id)).toBe(4);
    expect(await prisma.paymentEvent.count({ where: { orderId: order.id, status: "settlement" } })).toBe(1);
  });

  it("bayar setelah kedaluwarsa dengan stok cukup → DIBAYAR dan stok ditahan lagi", async () => {
    const { order, variant } = await makeOrder({ stock: 3, qty: 1 });
    await prisma.$transaction(async (tx) => {
      const { releaseStock } = await import("@/features/orders/stock");
      await releaseStock(tx, order.id);
      await tx.order.update({ where: { id: order.id }, data: { status: "KEDALUWARSA" } });
    });
    expect(await stockOf(variant.id)).toBe(3);
    const r = await handleMidtransNotification(notif(order, "settlement"));
    expect(r.outcome).toBe("paid");
    const after = await orderOf(order.id);
    expect(after).toMatchObject({ status: "DIBAYAR", stockHeld: true });
    expect(await stockOf(variant.id)).toBe(2);
  });

  it("bayar setelah kedaluwarsa dengan stok habis → PERLU_TINDAKAN", async () => {
    const { order, variant } = await makeOrder({ stock: 1, qty: 1 });
    await prisma.$transaction(async (tx) => {
      const { releaseStock } = await import("@/features/orders/stock");
      await releaseStock(tx, order.id);
      await tx.order.update({ where: { id: order.id }, data: { status: "KEDALUWARSA" } });
      await tx.variant.update({ where: { id: variant.id }, data: { stock: 0 } }); // terjual ke orang lain
    });
    const r = await handleMidtransNotification(notif(order, "settlement"));
    expect(r.outcome).toBe("needs_action");
    const after = await orderOf(order.id);
    expect(after).toMatchObject({ status: "PERLU_TINDAKAN", stockHeld: false });
    expect(after.adminNote).toContain("Dibayar setelah kedaluwarsa, stok tidak cukup");
    expect(after.paidAt).not.toBeNull();
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("expire → KEDALUWARSA dan stok kembali", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 2 });
    const r = await handleMidtransNotification(notif(order, "expire"));
    expect(r.outcome).toBe("released");
    expect(await orderOf(order.id)).toMatchObject({ status: "KEDALUWARSA", stockHeld: false });
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("cancel/deny → BATAL dan stok kembali", async () => {
    const { order, variant } = await makeOrder({ stock: 5, qty: 1 });
    await handleMidtransNotification(notif(order, "deny"));
    expect((await orderOf(order.id)).status).toBe("BATAL");
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("Review Focus 5: nominal tidak cocok → PERLU_TINDAKAN, bukan DIBAYAR", async () => {
    const { order } = await makeOrder({ stock: 5 });
    const r = await handleMidtransNotification(notif(order, "settlement", { gross_amount: "1000.00" }));
    expect(r.outcome).toBe("needs_action");
    const after = await orderOf(order.id);
    expect(after.status).toBe("PERLU_TINDAKAN");
    expect(after.adminNote).toContain("Nominal tidak cocok");
  });

  it("tanda tangan salah → 401 tanpa perubahan apa pun", async () => {
    const { order } = await makeOrder({ stock: 5 });
    const r = await handleMidtransNotification(notif(order, "settlement", { signature_key: "palsu" }));
    expect(r).toEqual({ status: 401, outcome: "invalid" });
    expect((await orderOf(order.id)).status).toBe("MENUNGGU_BAYAR");
    expect(await prisma.paymentEvent.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("kode pesanan tidak dikenal → 404", async () => {
    const r = await handleMidtransNotification(notif({ code: "TRH-000000-XXXX", total: 1000 }, "settlement"));
    expect(r).toEqual({ status: 404, outcome: "ignored" });
  });

  it("capture dengan fraud_status challenge tidak menandai lunas", async () => {
    const { order } = await makeOrder({ stock: 5 });
    const r = await handleMidtransNotification(notif(order, "capture", { fraud_status: "challenge", status_code: "201" }));
    expect(r.outcome).toBe("ignored");
    expect((await orderOf(order.id)).status).toBe("MENUNGGU_BAYAR");
  });
});
