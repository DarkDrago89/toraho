import type { Metadata } from "next";
import { auth } from "@/auth";
import { getShippingMode } from "@/lib/shipping";
import { PROVINCES } from "@/lib/shipping/provinces";
import { getShippingRates } from "@/features/settings/service";
import { CheckoutForm } from "@/features/checkout/CheckoutForm";
import { getCheckoutDefaults } from "@/features/checkout/defaults";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [rates, session, shippingMode] = await Promise.all([getShippingRates(), auth(), getShippingMode()]);
  // Hanya provinsi yang sudah punya tarif yang bisa dipilih.
  const provinces = PROVINCES.filter((p) => rates[p.code] > 0).map((p) => ({ code: p.code, name: p.name }));
  const midtransReady = !!process.env.MIDTRANS_SERVER_KEY;
  const defaults = session?.user?.role === "customer" ? await getCheckoutDefaults(session.user.id) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="eyebrow">Langkah terakhir</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">Checkout</h1>
      <CheckoutForm provinces={provinces} midtransReady={midtransReady} defaults={defaults} shippingMode={shippingMode} />
    </div>
  );
}
