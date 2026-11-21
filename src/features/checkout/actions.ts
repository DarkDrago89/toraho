"use server";

import { auth } from "@/auth";
import { getShippingProvider } from "@/lib/shipping";
import { createOrder, type CheckoutInput } from "./service";
import { startPayment } from "@/features/payments/start";

export async function quoteShipping(provinceCode: string, weightGrams: number) {
  const q = await (await getShippingProvider()).quote({
    destination: { provinceCode, city: "", district: "", postalCode: "" },
    weightGrams,
  });
  return q;
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
