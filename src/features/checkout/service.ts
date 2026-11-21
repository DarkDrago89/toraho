import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOrderCode } from "@/lib/domain/order-code";
import { normalizePhone } from "@/lib/domain/phone";
import { computeTotals } from "@/lib/domain/totals";
import { getShippingProvider } from "@/lib/shipping";
import { isProvinceCode } from "@/lib/shipping/provinces";
import { getSettings } from "@/features/settings/service";
import { holdStock, StockError } from "@/features/orders/stock";
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
    .transform((v) => (v ? v : undefined))
    .pipe(z.email("Email tidak valid").optional()),
  provinceCode: z.string().refine(isProvinceCode, "Pilih provinsi"),
  city: req("Kota/kabupaten wajib diisi").max(100),
  district: req("Kecamatan wajib diisi").max(100),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 angka"),
  addressLine: req("Alamat lengkap wajib diisi").max(300),
  paymentMethod: z.enum(["MIDTRANS", "MANUAL"], "Pilih metode pembayaran"),
  lines: z
    .array(z.object({ variantId: z.string(), qty: z.number().int().positive().max(99) }))
    .min(1, "Tas belanja kosong"),
});

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
export async function createOrder(raw: CheckoutInput, now = new Date()): Promise<CreateOrderResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const data = parsed.data;
  const lines = mergeLines(data.lines);

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

  // 2. Ongkir.
  const totalsNoShip = computeTotals(items, 0);
  const shipping = await (await getShippingProvider()).quote({
    destination: { provinceCode: data.provinceCode, city: data.city, district: data.district, postalCode: data.postalCode },
    weightGrams: totalsNoShip.weightGrams,
  });
  if (!shipping) return { ok: false, errors: ["Pengiriman ke provinsi ini belum tersedia"] };
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
            paymentMethod: data.paymentMethod,
            customerName: data.customerName,
            phone: data.phone,
            email: data.email ?? null,
            provinceCode: data.provinceCode,
            city: data.city,
            district: data.district,
            postalCode: data.postalCode,
            addressLine: data.addressLine,
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
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return { ok: false, errors: ["Gagal membuat kode pesanan, coba lagi"] };
}
