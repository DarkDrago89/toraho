import type { Order, Prisma } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import { canTransition, type OrderStatus } from "@/lib/domain/order-status";
import { getSettings } from "@/features/settings/service";
import { expireStaleOrders } from "./service";
import { holdStock, releaseStock, StockError } from "./stock";

export type AdminResult = { ok: true } | { ok: false; error: string };
const DENIED: AdminResult = { ok: false, error: "Perubahan status tidak diizinkan" };

class Denied extends Error {}

/**
 * Menjalankan perubahan status admin dengan baris pesanan dikunci, sehingga tidak balapan
 * dengan webhook Midtrans / cron. Semua perpindahan wajib lolos canTransition.
 */
async function transition(
  orderId: string,
  to: OrderStatus,
  work: (tx: Tx, order: Order) => Promise<Prisma.OrderUpdateInput | void>,
): Promise<AdminResult> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || !canTransition(order.status, to)) throw new Denied();
      const extra = (await work(tx, order)) ?? {};
      await tx.order.update({ where: { id: orderId }, data: { status: to, ...extra } });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return DENIED;
    if (e instanceof StockError) return { ok: false, error: `${e.message}. Tambah stok dulu di halaman produk.` };
    throw e;
  }
}

export async function confirmManualPayment(orderId: string, now = new Date()): Promise<AdminResult> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (o?.status !== "MENUNGGU_VERIFIKASI") return DENIED;
  return transition(orderId, "DIBAYAR", async () => ({ paidAt: now }));
}

export async function rejectManualPayment(orderId: string, reason: string, now = new Date()): Promise<AdminResult> {
  const why = reason.trim();
  if (!why) return { ok: false, error: "Alasan penolakan wajib diisi" };
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (o?.status !== "MENUNGGU_VERIFIKASI") return DENIED;
  const { paymentWindowHours } = await getSettings();
  // Stok tetap ditahan; pembeli mendapat batas waktu baru untuk mengunggah ulang.
  return transition(orderId, "MENUNGGU_BAYAR", async () => ({
    rejectReason: why.slice(0, 300),
    paymentDeadline: new Date(now.getTime() + paymentWindowHours * 3600_000),
  }));
}

export async function cancelOrder(orderId: string, note?: string): Promise<AdminResult> {
  return transition(orderId, "BATAL", async (tx, order) => {
    await releaseStock(tx, order.id); // hanya jika stockHeld
    return note?.trim() ? { adminNote: note.trim().slice(0, 500) } : {};
  });
}

export async function resolveNeedsAction(orderId: string, now = new Date()): Promise<AdminResult> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (o?.status !== "PERLU_TINDAKAN") return DENIED;
  return transition(orderId, "DIBAYAR", async (tx, order) => {
    if (!order.stockHeld) {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      await holdStock(tx, items.map((i) => ({ variantId: i.variantId, qty: i.qty, label: `${i.productName} (${i.variantLabel})` })));
    }
    return { stockHeld: true, paidAt: order.paidAt ?? now };
  });
}

export async function advanceStatus(orderId: string, to: "DIKEMAS" | "DIKIRIM" | "SELESAI", trackingNumber?: string): Promise<AdminResult> {
  const resi = trackingNumber?.trim();
  if (to === "DIKIRIM" && !resi) return { ok: false, error: "Nomor resi wajib diisi" };
  return transition(orderId, to, async () => (to === "DIKIRIM" ? { trackingNumber: resi!.slice(0, 60) } : {}));
}

export async function markRefunded(orderId: string): Promise<AdminResult> {
  const r = await prisma.order.updateMany({
    where: { id: orderId, status: "BATAL", paidAt: { not: null }, refunded: false },
    data: { refunded: true },
  });
  return r.count ? { ok: true } : { ok: false, error: "Hanya pesanan batal yang pernah lunas yang bisa ditandai sudah refund" };
}

export async function updateAdminNote(orderId: string, note: string): Promise<AdminResult> {
  await prisma.order.update({ where: { id: orderId }, data: { adminNote: note.trim().slice(0, 500) || null } });
  return { ok: true };
}

// ---------- Daftar & detail ----------

const PRIORITY: Partial<Record<OrderStatus, number>> = { PERLU_TINDAKAN: 0, MENUNGGU_VERIFIKASI: 1 };

export type OrderListFilter = { status?: OrderStatus; from?: Date; to?: Date; q?: string };

export async function listOrders(f: OrderListFilter, limit = 200) {
  await expireStaleOrders(); // status di daftar selalu terkini walau cron harian belum jalan
  const q = f.q?.trim();
  const rows = await prisma.order.findMany({
    where: {
      ...(f.status ? { status: f.status } : {}),
      ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q.toUpperCase() } },
              { customerName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q.replace(/\D/g, "") || q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { items: true } } },
  });
  return rows.sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9) || +b.createdAt - +a.createdAt);
}

export async function countByStatus() {
  const g = await prisma.order.groupBy({ by: ["status"], _count: true });
  return Object.fromEntries(g.map((x) => [x.status, x._count])) as Partial<Record<OrderStatus, number>>;
}

export async function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      proofs: { orderBy: { createdAt: "desc" } },
      paymentEvents: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true, externalId: true } },
    },
  });
}
