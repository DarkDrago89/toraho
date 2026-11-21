import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, PaymentRequest, PaymentSession } from "./types";

/** Hanya QRIS + Virtual Account. Kartu kredit sengaja tidak diaktifkan (biaya 2,9% + Rp2.000). */
export const ENABLED_PAYMENTS = ["other_qris", "bca_va", "bni_va", "bri_va", "permata_va", "cimb_va", "echannel", "other_va"];

type Config = {
  serverKey: string;
  isProduction: boolean;
  siteUrl: string;
  /** URL notifikasi pengganti untuk transaksi ini (mis. tunnel ngrok saat uji lokal). Kosong = URL di dashboard. */
  notificationUrl?: string;
};

/** Midtrans: SHA512(order_id + status_code + gross_amount + serverKey) harus sama dengan signature_key. */
export function verifyMidtransSignature(
  n: { order_id: string; status_code: string; gross_amount: string; signature_key: string },
  serverKey: string,
): boolean {
  if (!n.signature_key || !serverKey) return false;
  const expected = createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + serverKey).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(n.signature_key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Midtrans membatasi nama item 50 karakter. */
const clip = (s: string) => (s.length > 50 ? s.slice(0, 49) + "…" : s);

export function createMidtransProvider(cfg: Config): PaymentProvider {
  const base = cfg.isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";

  return {
    async createPayment(req: PaymentRequest): Promise<PaymentSession> {
      const item_details = [
        ...req.items.map((it, i) => ({ id: `ITEM-${i + 1}`, name: clip(it.name), price: it.price, quantity: it.qty })),
        ...(req.shippingCost > 0 ? [{ id: "ONGKIR", name: "Ongkos kirim", price: req.shippingCost, quantity: 1 }] : []),
      ];
      const body = {
        transaction_details: { order_id: req.code, gross_amount: req.total },
        item_details,
        customer_details: { first_name: clip(req.customerName), phone: req.phone, ...(req.email ? { email: req.email } : {}) },
        enabled_payments: ENABLED_PAYMENTS,
        expiry: { unit: "hour", duration: req.expiryHours },
        callbacks: { finish: `${cfg.siteUrl}/pesanan/${req.code}?hp=${encodeURIComponent(req.phone)}` },
      };

      const res = await fetch(`${base}/snap/v1/transactions`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(cfg.serverKey + ":").toString("base64"),
          ...(cfg.notificationUrl ? { "X-Override-Notification": cfg.notificationUrl } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { token?: string; redirect_url?: string; error_messages?: string[] };
      if (!res.ok || !json.token || !json.redirect_url) {
        throw new Error(`Midtrans ${res.status}: ${json.error_messages?.join("; ") ?? "respon tidak valid"}`);
      }
      return { token: json.token, redirectUrl: json.redirect_url };
    },
  };
}

/** Provider dari env server. null jika MIDTRANS_SERVER_KEY belum diisi. */
export function midtransFromEnv(): PaymentProvider | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  let notificationUrl = process.env.MIDTRANS_NOTIFICATION_URL?.trim() || undefined;
  // Override hanya untuk uji sandbox lewat tunnel. Di production, URL yang tertinggal akan mengirim webhook
  // pembayaran asli ke tunnel yang sudah mati → pesanan lunas tidak pernah tercatat. Pakai URL di dashboard.
  if (isProduction && notificationUrl) {
    console.warn("[midtrans] MIDTRANS_NOTIFICATION_URL diabaikan di production; atur Payment Notification URL di dashboard Midtrans.");
    notificationUrl = undefined;
  }
  return createMidtransProvider({
    serverKey,
    isProduction,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
    notificationUrl,
  });
}
