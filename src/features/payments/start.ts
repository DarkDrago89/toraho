import { prisma } from "@/lib/db";
import { midtransFromEnv } from "@/lib/payment/midtrans";
import { getSettings } from "@/features/settings/service";

/**
 * Menyiapkan transaksi Midtrans Snap untuk pesanan MENUNGGU_BAYAR dan menyimpan token/URL-nya.
 * Jika transaksi sudah pernah dibuat, URL lama dipakai lagi (Midtrans menolak order_id ganda).
 * Mengembalikan null jika Midtrans belum dikonfigurasi atau gagal (pesanan tetap ada; pembeli bisa coba lagi).
 */
export async function startPayment(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.paymentMethod !== "MIDTRANS" || order.status !== "MENUNGGU_BAYAR") return null;
  if (order.midtransRedirectUrl) return order.midtransRedirectUrl;

  const provider = midtransFromEnv();
  if (!provider) return null;

  // Sisa waktu bayar (dibulatkan ke atas, minimal 1 jam) agar expiry Snap selaras dengan paymentDeadline.
  const { paymentWindowHours } = await getSettings();
  const hoursLeft = Math.max(1, Math.ceil((order.paymentDeadline.getTime() - Date.now()) / 3600_000));

  try {
    const session = await provider.createPayment({
      code: order.code,
      total: order.total,
      customerName: order.customerName,
      phone: order.phone,
      email: order.email,
      items: order.items.map((i) => ({ name: `${i.productName} (${i.variantLabel})`, price: i.price, qty: i.qty })),
      shippingCost: order.shippingCost,
      expiryHours: Math.min(hoursLeft, paymentWindowHours),
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { midtransToken: session.token, midtransRedirectUrl: session.redirectUrl },
    });
    return session.redirectUrl;
  } catch (e) {
    console.error(`[midtrans] gagal membuat transaksi ${order.code}:`, e);
    return null;
  }
}
