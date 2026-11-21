import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canTransition, type OrderStatus } from "@/lib/domain/order-status";
import { verifyMidtransSignature } from "@/lib/payment/midtrans";
import { releaseStock, tryReholdStock } from "@/features/orders/stock";

export type MidtransNotification = {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  fraud_status?: string;
  payment_type?: string;
  [k: string]: unknown;
};

export type WebhookOutcome = "paid" | "ignored" | "needs_action" | "released" | "invalid";
export type WebhookResult = { status: number; outcome: WebhookOutcome };

const PAID = new Set(["settlement", "capture"]);
const FAILED = new Set(["cancel", "deny", "failure"]);

/**
 * Memproses notifikasi Midtrans. Status lunas HANYA ditentukan di sini (tanda tangan terverifikasi),
 * bukan dari redirect browser. Idempoten: notifikasi yang sama (transaksi + status) hanya diproses sekali,
 * dan status pesanan tidak pernah mundur karena semua perubahan lewat canTransition.
 */
export async function handleMidtransNotification(n: MidtransNotification, now = new Date()): Promise<WebhookResult> {
  if (!verifyMidtransSignature(n, process.env.MIDTRANS_SERVER_KEY ?? "")) return { status: 401, outcome: "invalid" };

  const order = await prisma.order.findUnique({ where: { code: n.order_id } });
  if (!order) return { status: 404, outcome: "ignored" };

  try {
    const outcome = await prisma.$transaction(async (tx): Promise<WebhookOutcome> => {
      // Unique (provider, externalId, status): notifikasi ganda → P2002 → seluruh transaksi dibatalkan.
      await tx.paymentEvent.create({
        data: {
          orderId: order.id,
          provider: "midtrans",
          externalId: n.transaction_id,
          status: n.transaction_status,
          raw: n as unknown as Prisma.InputJsonValue,
        },
      });

      // Baca ulang di dalam transaksi + kunci baris agar tidak balapan dengan aksi admin/cron.
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
      const cur = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      const status = cur.status as OrderStatus;
      const move = (to: OrderStatus, data: Prisma.OrderUpdateInput = {}) =>
        tx.order.update({ where: { id: cur.id }, data: { status: to, ...data } });

      const isPaid = PAID.has(n.transaction_status) && (n.transaction_status === "settlement" || n.fraud_status === "accept");

      if (isPaid) {
        if (Math.round(Number(n.gross_amount)) !== cur.total) {
          if (!canTransition(status, "PERLU_TINDAKAN")) return "ignored";
          await move("PERLU_TINDAKAN", {
            adminNote: `Nominal tidak cocok: Midtrans Rp${n.gross_amount}, pesanan Rp${cur.total}. Cek dashboard Midtrans.`,
          });
          return "needs_action";
        }
        if (status === "MENUNGGU_BAYAR") {
          await move("DIBAYAR", { paidAt: now });
          return "paid";
        }
        if (status === "KEDALUWARSA") {
          if (await tryReholdStock(tx, cur.id)) {
            await move("DIBAYAR", { paidAt: now });
            return "paid";
          }
          await move("PERLU_TINDAKAN", {
            paidAt: now,
            adminNote: "Dibayar setelah kedaluwarsa, stok tidak cukup. Tambah stok lalu selesaikan, atau batalkan + refund.",
          });
          return "needs_action";
        }
        if (status === "BATAL") {
          // Pesanan sudah dibatalkan admin tapi pembeli tetap membayar (VA/QRIS masih aktif di Midtrans).
          // Status tetap BATAL; uang dicatat agar muncul sebagai kewajiban refund, bukan hilang tanpa jejak.
          await tx.order.update({
            where: { id: cur.id },
            data: {
              paidAt: cur.paidAt ?? now,
              adminNote: `${cur.adminNote ? cur.adminNote + " · " : ""}Pembayaran Midtrans masuk Rp${cur.total} untuk pesanan yang sudah batal: refund manual ke pembeli.`,
            },
          });
          return "needs_action";
        }
        return "ignored";
      }

      if (n.transaction_status === "expire" && status === "MENUNGGU_BAYAR") {
        await releaseStock(tx, cur.id);
        await move("KEDALUWARSA");
        return "released";
      }
      if (FAILED.has(n.transaction_status) && status === "MENUNGGU_BAYAR") {
        await releaseStock(tx, cur.id);
        await move("BATAL", { adminNote: `Pembayaran Midtrans ${n.transaction_status}` });
        return "released";
      }
      return "ignored"; // pending, atau status yang sudah lebih maju
    });
    return { status: 200, outcome };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { status: 200, outcome: "ignored" };
    throw e;
  }
}
