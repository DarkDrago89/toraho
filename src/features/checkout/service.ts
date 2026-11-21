import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOrderCode } from "@/lib/domain/order-code";
import { normalizePhone } from "@/lib/domain/phone";
import { computeTotals } from "@/lib/domain/totals";
import { getShippingOptions, STANDARD_OPTION_ID } from "@/lib/shipping";
import { getRajaOngkirConfig } from "@/lib/shipping/config";
import { isProvinceCode } from "@/lib/shipping/provinces";
import { ShippingApiError } from "@/lib/shipping/rajaongkir";
import type { ShippingDestination } from "@/lib/shipping/types";
import { USE_SEARCH_ERROR } from "./messages";
import { getSettings } from "@/features/settings/service";
import { holdStock, isRetryableTxError, StockError } from "@/features/orders/stock";
import { expireStaleOrders } from "@/features/orders/service";
import type { CartLine } from "@/features/cart/cart-store";

export type PaymentMethod = "MIDTRANS" | "MANUAL";

export type CheckoutInput = {
  lines: CartLine[];
  customerName: string;
  phone: string;
  email?: string;
  provinceCode: string;
  city: string;
  district: string;
  postalCode: string;
  addressLine: string;
  paymentMethod: PaymentMethod;
  /** Id opsi ongkir yang dipilih pembeli (mis. "standar" atau "jne:REG"). */
  shippingOptionId: string;
  /** Id tujuan RajaOngkir dari hasil pencarian. Kosong = isian wilayah manual (tarif standar). */
  destinationId?: string;
  /** Ongkir yang dilihat pembeli; jika berbeda dari hitungan server, pesanan ditolak agar tidak salah tagih. */
  expectedShippingCost?: number;
};

export type CreatedOrder = { id: string; code: string; total: number; paymentMethod: PaymentMethod; phone: string };
export type CreateOrderResult = { ok: true; order: CreatedOrder } | { ok: false; errors: string[] };

const req = (msg: string) => z.string().trim().min(1, msg);

const schema = z.object({
  customerName: req("Nama wajib diisi").max(100),
  phone: z.string().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Nomor HP/WA tidak valid" });
    return n ?? "";
  }),
  email: z
    .string()
    .trim()
    .optional()
    // Huruf kecil: email dipakai untuk mencocokkan pesanan ke akun Google (pencocokan persis, tanpa ILIKE).
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .pipe(z.email("Email tidak valid").optional()),
  // Wilayah divalidasi terpisah (manualAddress): pada mode kurir datanya diambil dari server.
  provinceCode: z.string().trim().max(10),
  city: z.string().trim().max(100),
  district: z.string().trim().max(100),
  postalCode: z.string().trim().max(10),
  destinationId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v || undefined),
  shippingOptionId: req("Pilih layanan pengiriman").max(60),
  expectedShippingCost: z.number().int().nonnegative().optional(),
  addressLine: req("Alamat lengkap wajib diisi").max(300),
  paymentMethod: z.enum(["MIDTRANS", "MANUAL"], "Pilih metode pembayaran"),
  lines: z
    .array(z.object({ variantId: z.string(), qty: z.number().int().positive().max(99) }))
    .min(1, "Tas belanja kosong"),
});

/** Wilayah yang diketik pembeli (mode tarif standar / isian manual). */
const manualAddress = z.object({
  provinceCode: z.string().refine(isProvinceCode, "Pilih provinsi"),
  city: req("Kota/kabupaten wajib diisi"),
  district: req("Kecamatan wajib diisi"),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 angka"),
});

type Destination = ShippingDestination & { subdistrict: string | null };

export { USE_SEARCH_ERROR };

/**
 * Tujuan pengiriman. Mode kurir: data wilayah diambil dari RajaOngkir berdasarkan id (bukan dari isian
 * browser), supaya alamat dan ongkir selalu cocok. Isian manual (tarif standar, mengabaikan berat) hanya
 * diterima jika mode kurir tidak aktif, atau server sendiri baru saja melihat RajaOngkir gagal — supaya
 * tarif standar tidak bisa dipaksa dengan sekadar tidak mengirim id tujuan.
 */
export async function resolveDestination(d: {
  destinationId?: string;
  provinceCode: string;
  city: string;
  district: string;
  postalCode: string;
}): Promise<{ ok: true; value: Destination } | { ok: false; error: string }> {
  const config = await getRajaOngkirConfig();
  if (!d.destinationId) {
    if (config && !(await config.client.recentlyFailed())) return { ok: false, error: USE_SEARCH_ERROR };
    return { ok: true, value: { provinceCode: d.provinceCode, city: d.city, district: d.district, postalCode: d.postalCode, subdistrict: null } };
  }
  if (!config) return { ok: false, error: "Pengiriman kurir sedang tidak tersedia, silakan muat ulang halaman" };
  try {
    const found = await config.client.lookupDestination(d.destinationId, d.postalCode);
    if (!found) return { ok: false, error: "Alamat tujuan tidak valid, silakan pilih ulang" };
    return {
      ok: true,
      value: {
        destinationId: found.id,
        provinceCode: found.provinceCode,
        city: found.city,
        district: found.district,
        subdistrict: found.subdistrict || null,
        postalCode: found.postalCode,
      },
    };
  } catch (e) {
    if (e instanceof ShippingApiError) return { ok: false, error: "Gagal menghitung ongkir, coba lagi" };
    throw e;
  }
}

/** Menggabungkan baris ganda varian yang sama agar pengecekan stok tidak bisa diakali. */
function mergeLines(lines: CartLine[]): CartLine[] {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.variantId, (m.get(l.variantId) ?? 0) + l.qty);
  return [...m].map(([variantId, qty]) => ({ variantId, qty }));
}

/**
 * Membuat pesanan dari keranjang. Harga, berat, dan ketersediaan selalu diambil dari database.
 * Stok ditahan di transaksi yang sama, jadi pesanan gagal tidak pernah meninggalkan stok terpotong.
 */
/** `customerId` diisi server dari sesi login Google, tidak pernah dari isian klien. */
export async function createOrder(raw: CheckoutInput, now = new Date(), customerId: string | null = null): Promise<CreateOrderResult> {
  const parsed = schema.safeParse(raw);
  // Isian wilayah manual dicek bersamaan agar semua kesalahan tampil sekaligus.
  const address = raw.destinationId?.trim() ? null : manualAddress.safeParse(raw);
  const issues = [...(parsed.success ? [] : parsed.error.issues), ...(address && !address.success ? address.error.issues : [])];
  if (!parsed.success || issues.length) return { ok: false, errors: [...new Set(issues.map((i) => i.message))] };
  const data = parsed.data;
  const lines = mergeLines(data.lines);

  // Lepas dulu stok yang ditahan pesanan kedaluwarsa: cron hanya berjalan harian, jadi tanpa ini
  // ukuran terakhir bisa tampak "habis" seharian karena pesanan yang ditinggal pembeli lain.
  await expireStaleOrders(now);

  // 1. Validasi barang terhadap data server.
  const variants = await prisma.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: { product: { include: { category: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const errors: string[] = [];
  for (const l of lines) {
    const v = byId.get(l.variantId);
    if (!v) errors.push("Ada barang di tas yang sudah tidak dijual");
    else if (v.isArchived || !v.product.isVisible || !v.product.category.isVisible)
      errors.push(`${v.product.name} sudah tidak tersedia`);
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };

  const items = lines.map((l) => {
    const v = byId.get(l.variantId)!;
    return {
      variantId: v.id,
      productName: v.product.name,
      variantLabel: v.label,
      price: v.product.price,
      qty: l.qty,
      weightGrams: v.product.weightGrams,
    };
  });

  // 2. Tujuan + ongkir. Dihitung ulang di server; pilihan pembeli harus ada dengan harga yang sama.
  const totalsNoShip = computeTotals(items, 0);
  const dest = await resolveDestination(data);
  if (!dest.ok) return { ok: false, errors: [dest.error] };
  const { options, fallback } = await getShippingOptions({ destination: dest.value, weightGrams: totalsNoShip.weightGrams });
  const shipping = options.find((o) => o.id === data.shippingOptionId);
  if (!shipping || (data.expectedShippingCost !== undefined && data.expectedShippingCost !== shipping.cost)) {
    let error = "Ongkir berubah, silakan pilih ulang layanan kurir";
    // Pembeli memilih layanan kurir, tetapi RajaOngkir sekarang gagal → minta coba lagi.
    if (fallback && data.shippingOptionId !== STANDARD_OPTION_ID) error = "Gagal menghitung ongkir, coba lagi";
    else if (!options.length) error = dest.value.destinationId ? "Pengiriman ke tujuan ini belum tersedia" : "Pengiriman ke provinsi ini belum tersedia";
    return { ok: false, errors: [error] };
  }
  const totals = computeTotals(items, shipping.cost);

  const { paymentWindowHours } = await getSettings();
  const paymentDeadline = new Date(now.getTime() + paymentWindowHours * 3600_000);

  // 3. Tahan stok + simpan pesanan dalam satu transaksi. Kode bentrok (sangat jarang) → coba lagi.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        await holdStock(
          tx,
          items.map((i) => ({ variantId: i.variantId, qty: i.qty, label: `${i.productName} (${i.variantLabel})` })),
        );
        return tx.order.create({
          data: {
            code: generateOrderCode(now),
            customerId,
            paymentMethod: data.paymentMethod,
            customerName: data.customerName,
            phone: data.phone,
            email: data.email ?? null,
            provinceCode: dest.value.provinceCode,
            city: dest.value.city,
            district: dest.value.district,
            subdistrict: dest.value.subdistrict,
            postalCode: dest.value.postalCode,
            addressLine: data.addressLine,
            shippingDestinationId: dest.value.destinationId ?? null,
            courierCode: shipping.courier,
            courierService: shipping.service,
            shippingEtd: shipping.etd,
            ...totals,
            paymentDeadline,
            stockHeld: true,
            items: { create: items },
          },
        });
      });
      return {
        ok: true,
        order: { id: order.id, code: order.code, total: order.total, paymentMethod: data.paymentMethod, phone: order.phone },
      };
    } catch (e) {
      if (e instanceof StockError) return { ok: false, errors: [e.message] };
      if (isRetryableTxError(e)) return { ok: false, errors: ["Toko sedang ramai, silakan coba lagi sebentar"] };
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return { ok: false, errors: ["Gagal membuat kode pesanan, coba lagi"] };
}

/** Berat total keranjang (gram) dari data produk di database, bukan dari browser. */
export async function weightOfLines(lines: CartLine[]): Promise<number> {
  const merged = mergeLines(lines.filter((l) => typeof l.variantId === "string" && Number.isInteger(l.qty) && l.qty > 0 && l.qty <= 99)).slice(0, 50);
  if (!merged.length) return 0;
  const variants = await prisma.variant.findMany({
    where: { id: { in: merged.map((l) => l.variantId) } },
    select: { id: true, product: { select: { weightGrams: true } } },
  });
  const w = new Map(variants.map((v) => [v.id, v.product.weightGrams]));
  return merged.reduce((n, l) => n + (w.get(l.variantId) ?? 0) * l.qty, 0);
}
