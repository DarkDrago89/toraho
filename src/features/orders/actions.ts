"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/domain/phone";
import { startPayment } from "@/features/payments/start";
import { getOrderForBuyer, submitPaymentProof, type ActionResult } from "./service";

export async function uploadProofAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const code = String(form.get("code") ?? "");
  const phone = String(form.get("phone") ?? "");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih foto bukti transfer dulu" };
  const r = await submitPaymentProof(code, phone, {
    name: file.name,
    type: file.type,
    size: file.size,
    bytes: Buffer.from(await file.arrayBuffer()),
  });
  if (r.ok) revalidatePath(`/pesanan/${code}`);
  return r;
}

/** Tombol "Bayar Sekarang": pakai URL Snap yang ada, atau buat ulang jika sebelumnya gagal. */
export async function payNowAction(form: FormData): Promise<void> {
  const code = String(form.get("code") ?? "");
  const phone = String(form.get("phone") ?? "");
  const order = await getOrderForBuyer(code, phone);
  if (!order) redirect("/lacak");
  const url = order.midtransRedirectUrl ?? (await startPayment(order.id));
  if (url) redirect(url);
  redirect(`/pesanan/${order.code}?hp=${encodeURIComponent(order.phone)}&gagal=1`);
}

export async function trackAction(_prev: { error: string } | null, form: FormData): Promise<{ error: string }> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!code || !phone) return { error: "Isi kode pesanan dan nomor HP yang dipakai saat checkout" };
  const exists = await prisma.order.findFirst({ where: { code, phone }, select: { code: true } });
  if (!exists) return { error: "Pesanan tidak ditemukan. Periksa kode dan nomor HP." };
  redirect(`/pesanan/${code}?hp=${encodeURIComponent(phone)}`);
}
