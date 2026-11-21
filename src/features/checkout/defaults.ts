import { prisma } from "@/lib/db";

/** Isian awal checkout untuk pembeli yang login: nama/email dari Google, HP dan alamat dari pesanan terakhir. */
export type CheckoutDefaults = {
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
};

export async function getCheckoutDefaults(customerId: string): Promise<CheckoutDefaults | null> {
  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, email: true, name: true } });
  if (!c) return null;
  // Hanya pesanan yang sudah terhubung ke akun: pesanan tamu yang cuma cocok email bisa saja milik orang lain.
  const last = await prisma.order.findFirst({
    where: { customerId: c.id },
    orderBy: { createdAt: "desc" },
    select: { customerName: true, phone: true, addressLine: true },
  });
  return {
    customerName: last?.customerName ?? c.name,
    email: c.email,
    phone: last?.phone ?? "",
    addressLine: last?.addressLine ?? "",
  };
}

