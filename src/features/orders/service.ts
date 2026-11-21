import { prisma } from "@/lib/db";
import { canTransition, type OrderStatus } from "@/lib/domain/order-status";
import { normalizePhone } from "@/lib/domain/phone";
import { extFor, getStorage, validateImageUpload } from "@/lib/storage";
import type { FileStorage, UploadFile } from "@/lib/storage/types";

export type BuyerOrderView = {
  id: string;
  code: string;
  status: OrderStatus;
  paymentMethod: "MIDTRANS" | "MANUAL";
  customerName: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  provinceCode: string;
  postalCode: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentDeadline: Date;
  trackingNumber: string | null;
  rejectReason: string | null;
  midtransRedirectUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
  items: { productName: string; variantLabel: string; price: number; qty: number }[];
  proofCount: number;
};

/** Pesanan untuk halaman status pembeli. Kode + nomor HP harus cocok (pengganti login). */
export async function getOrderForBuyer(code: string, phone: string): Promise<BuyerOrderView | null> {
  const p = normalizePhone(phone);
  if (!p) return null;
  const o = await prisma.order.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { items: true, _count: { select: { proofs: true } } },
  });
  if (!o || o.phone !== p) return null;
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    paymentMethod: o.paymentMethod,
    customerName: o.customerName,
    phone: o.phone,
    addressLine: o.addressLine,
    district: o.district,
    city: o.city,
    provinceCode: o.provinceCode,
    postalCode: o.postalCode,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    paymentDeadline: o.paymentDeadline,
    trackingNumber: o.trackingNumber,
    rejectReason: o.rejectReason,
    midtransRedirectUrl: o.midtransRedirectUrl,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    items: o.items.map((i) => ({ productName: i.productName, variantLabel: i.variantLabel, price: i.price, qty: i.qty })),
    proofCount: o._count.proofs,
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Pembeli mengunggah bukti transfer manual → MENUNGGU_VERIFIKASI (dicek admin). */
export async function submitPaymentProof(
  code: string,
  phone: string,
  file: UploadFile,
  now = new Date(),
  storage?: FileStorage,
): Promise<ActionResult> {
  const invalid = validateImageUpload(file);
  if (invalid) return { ok: false, error: invalid };

  const p = normalizePhone(phone);
  const order = p ? await prisma.order.findUnique({ where: { code: code.trim().toUpperCase() } }) : null;
  if (!order || order.phone !== p) return { ok: false, error: "Pesanan tidak ditemukan" };
  if (order.paymentMethod !== "MANUAL") return { ok: false, error: "Pesanan ini dibayar lewat Midtrans" };
  if (!canTransition(order.status, "MENUNGGU_VERIFIKASI") || order.status !== "MENUNGGU_BAYAR")
    return { ok: false, error: "Pesanan ini tidak sedang menunggu pembayaran" };
  if (now > order.paymentDeadline) return { ok: false, error: "Batas waktu pembayaran sudah lewat" };

  const url = await (storage ?? (await getStorage())).put(`bukti/${order.code}${extFor(file.type)}`, file.bytes, file.type);

  // Kondisi status di WHERE: jika admin/cron mengubah status di antara pengecekan dan simpan, unggahan ditolak.
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: "MENUNGGU_BAYAR" },
    data: { status: "MENUNGGU_VERIFIKASI", rejectReason: null },
  });
  if (updated.count === 0) return { ok: false, error: "Pesanan ini tidak sedang menunggu pembayaran" };
  await prisma.paymentProof.create({ data: { orderId: order.id, url } });
  return { ok: true };
}
