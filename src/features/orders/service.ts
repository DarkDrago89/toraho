import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canTransition, type OrderStatus } from "@/lib/domain/order-status";
import { normalizePhone } from "@/lib/domain/phone";
import { extFor, getStorage, validateImageUpload } from "@/lib/storage";
import type { FileStorage, UploadFile } from "@/lib/storage/types";
import { releaseStock } from "./stock";

export type BuyerOrderView = {
  id: string;
  code: string;
  status: OrderStatus;
  paymentMethod: "MIDTRANS" | "MANUAL";
  customerName: string;
  phone: string;
  addressLine: string;
  district: string;
  subdistrict: string | null;
  city: string;
  provinceCode: string;
  postalCode: string;
  subtotal: number;
  shippingCost: number;
  courierCode: string | null;
  courierService: string | null;
  shippingEtd: string | null;
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

const normCode = (code: string) => code.trim().toUpperCase();

/** Pesanan untuk halaman status pembeli. Kode + nomor HP harus cocok (pengganti login). */
export async function getOrderForBuyer(code: string, phone: string): Promise<BuyerOrderView | null> {
  const p = normalizePhone(phone);
  if (!p) return null;
  return loadBuyerOrder({ code: normCode(code), phone: p });
}

/** Pesanan milik akun pembeli (sudah terhubung lewat customerId). Tidak butuh nomor HP. */
export async function getOrderForCustomer(code: string, customerId: string): Promise<BuyerOrderView | null> {
  return loadBuyerOrder({ code: normCode(code), customerId });
}

/**
 * Pesanan yang tampil di halaman Akun: milik akun, atau pesanan tamu (belum terhubung) yang emailnya
 * sama dengan email Google pembeli. Pesanan tamu hanya tampil ringkas, karena email checkout tidak diverifikasi.
 * Email pesanan dan email pembeli sama-sama disimpan huruf kecil, jadi dicocokkan PERSIS — bukan
 * `mode: "insensitive"`, yang di Postgres menjadi ILIKE dan memperlakukan `_` / `%` sebagai wildcard.
 */
export function ownedOrderWhere(c: { id: string; email: string }): Prisma.OrderWhereInput {
  return { OR: [{ customerId: c.id }, { customerId: null, email: c.email }] };
}

export type CustomerOrderRow = { code: string; createdAt: Date; status: OrderStatus; total: number; itemCount: number; linked: boolean };

export async function listCustomerOrders(customerId: string): Promise<CustomerOrderRow[]> {
  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, email: true } });
  if (!c) return [];
  await expireStaleOrders(new Date());
  const rows = await prisma.order.findMany({
    where: ownedOrderWhere(c),
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { code: true, createdAt: true, status: true, total: true, customerId: true, items: { select: { qty: true } } },
  });
  return rows.map((r) => ({
    code: r.code,
    createdAt: r.createdAt,
    status: r.status,
    total: r.total,
    itemCount: r.items.reduce((n, i) => n + i.qty, 0),
    linked: r.customerId === c.id,
  }));
}

/**
 * Menghubungkan pesanan tamu ke akun setelah pembeli membuktikan nomor HP-nya. Hanya untuk pesanan yang
 * belum terhubung dan emailnya sama dengan email Google pembeli. true = baru saja dihubungkan.
 */
export async function linkGuestOrder(code: string, phone: string, customerId: string): Promise<boolean> {
  const p = normalizePhone(phone);
  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { email: true } });
  if (!p || !c) return false;
  const r = await prisma.order.updateMany({
    where: { code: normCode(code), phone: p, customerId: null, email: c.email },
    data: { customerId },
  });
  return r.count === 1;
}

async function loadBuyerOrder(where: Prisma.OrderWhereInput): Promise<BuyerOrderView | null> {
  const found = await prisma.order.findFirst({ where, select: { id: true } });
  if (!found) return null;
  // Lazy expire: pembeli langsung melihat status benar walau cron belum berjalan.
  await expireStaleOrders(new Date(), found.id);
  const o = await prisma.order.findUnique({
    where: { id: found.id },
    include: { items: true, _count: { select: { proofs: true } } },
  });
  if (!o) return null;
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    paymentMethod: o.paymentMethod,
    customerName: o.customerName,
    phone: o.phone,
    addressLine: o.addressLine,
    district: o.district,
    subdistrict: o.subdistrict,
    city: o.city,
    provinceCode: o.provinceCode,
    postalCode: o.postalCode,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    courierCode: o.courierCode,
    courierService: o.courierService,
    shippingEtd: o.shippingEtd,
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

/**
 * Pesanan MENUNGGU_BAYAR yang lewat batas waktu → KEDALUWARSA + stok dikembalikan.
 * MENUNGGU_VERIFIKASI (bukti sudah diunggah) sengaja tidak disentuh: menunggu keputusan admin.
 * Aman dijalankan berulang/bersamaan: status dicek ulang di WHERE dan stok dilepas lewat flag stockHeld.
 */
export async function expireStaleOrders(now = new Date(), onlyOrderId?: string): Promise<number> {
  const stale = await prisma.order.findMany({
    where: { status: "MENUNGGU_BAYAR", paymentDeadline: { lt: now }, ...(onlyOrderId ? { id: onlyOrderId } : {}) },
    select: { id: true },
  });
  let count = 0;
  for (const { id } of stale) {
    const changed = await prisma.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({
        where: { id, status: "MENUNGGU_BAYAR", paymentDeadline: { lt: now } },
        data: { status: "KEDALUWARSA" },
      });
      if (moved.count === 0) return false;
      await releaseStock(tx, id);
      return true;
    });
    if (changed) count++;
  }
  return count;
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
