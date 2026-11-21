"use server";

import { auth } from "@/auth";
import { getShippingOptions, type ShippingOptionsResult } from "@/lib/shipping";
import type { CartLine } from "@/features/cart/cart-store";
import { createOrder, resolveDestination, weightOfLines, type CheckoutInput } from "./service";
import { startPayment } from "@/features/payments/start";

export type QuoteResult = ShippingOptionsResult & { error?: string };

/**
 * Pilihan pengiriman untuk layar checkout. Berat dihitung dari database; tujuan mode kurir diverifikasi
 * di server. Hasilnya hanya untuk ditampilkan — createOrder menghitung ulang dengan aturan yang sama.
 */
export async function quoteShippingOptions(input: {
  destinationId?: string;
  postalCode?: string;
  provinceCode?: string;
  lines: CartLine[];
}): Promise<QuoteResult> {
  const dest = await resolveDestination({
    destinationId: input.destinationId?.trim() || undefined,
    provinceCode: String(input.provinceCode ?? ""),
    city: "",
    district: "",
    postalCode: String(input.postalCode ?? ""),
  });
  if (!dest.ok) return { options: [], fallback: true, error: dest.error };
  const weightGrams = await weightOfLines(Array.isArray(input.lines) ? input.lines : []);
  return getShippingOptions({ destination: dest.value, weightGrams });
}

export type PlaceOrderResult =
  | { ok: true; code: string; phone: string; redirectUrl: string | null }
  | { ok: false; errors: string[] };

/** Buat pesanan, lalu (untuk Midtrans) siapkan transaksi Snap. */
export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  // Pemilik pesanan diambil dari sesi di server, tidak pernah dari data yang dikirim browser.
  const session = await auth();
  const customerId = session?.user?.role === "customer" ? session.user.id : null;
  const r = await createOrder(input, new Date(), customerId);
  if (!r.ok) return r;
  const redirectUrl = r.order.paymentMethod === "MIDTRANS" ? await startPayment(r.order.id) : null;
  return { ok: true, code: r.order.code, phone: r.order.phone, redirectUrl };
}
