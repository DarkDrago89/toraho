import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type GoogleProfileInput = {
  sub: string;
  email?: string | null;
  emailVerified?: boolean | null;
  name?: string | null;
  image?: string | null;
};

export type UpsertCustomerResult = { ok: true; customerId: string } | { ok: false; reason: "unverified" | "email-taken" };

/**
 * Dipanggil saat login Google. Email wajib sudah diverifikasi Google, karena email inilah yang
 * dipakai untuk menampilkan pesanan lama (checkout tanpa akun) di halaman Akun.
 */
export async function upsertGoogleCustomer(p: GoogleProfileInput): Promise<UpsertCustomerResult> {
  const email = p.email?.trim().toLowerCase();
  if (p.emailVerified !== true || !email) return { ok: false, reason: "unverified" };
  const name = p.name?.trim() || email.split("@")[0];
  const image = p.image ?? null;

  const owner = await prisma.customer.findUnique({ where: { email }, select: { googleSub: true } });
  if (owner && owner.googleSub !== p.sub) return { ok: false, reason: "email-taken" };

  try {
    const c = await prisma.customer.upsert({
      where: { googleSub: p.sub },
      create: { googleSub: p.sub, email, name, image },
      update: { email, name, image },
      select: { id: true },
    });
    return { ok: true, customerId: c.id };
  } catch (e) {
    // Dua login bersamaan dengan email yang sama dari akun Google berbeda.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, reason: "email-taken" };
    throw e;
  }
}

export async function findCustomerIdByGoogleSub(sub: string): Promise<string | null> {
  const c = await prisma.customer.findUnique({ where: { googleSub: sub }, select: { id: true } });
  return c?.id ?? null;
}
