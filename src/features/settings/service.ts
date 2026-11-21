import { prisma } from "@/lib/db";

export type BankAccount = { bank: string; number: string; holder: string };

export type StoreSettings = {
  /** Batas waktu bayar (jam). Dipakai untuk expiry Midtrans dan batas unggah bukti transfer manual. */
  paymentWindowHours: number;
  /** Nomor WhatsApp toko untuk footer dan halaman pesanan. */
  whatsapp: string;
  /** Rekening tujuan transfer manual. */
  bankAccounts: BankAccount[];
};

export const DEFAULT_SETTINGS: StoreSettings = { paymentWindowHours: 24, whatsapp: "", bankAccounts: [] };

const KEY = "store";

export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<StoreSettings> | undefined) ?? {}) };
}

export async function updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  const next = { ...(await getSettings()), ...patch };
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: next }, update: { value: next } });
  return next;
}

export async function getShippingRates(): Promise<Record<string, number>> {
  const rows = await prisma.shippingRate.findMany();
  return Object.fromEntries(rows.map((r) => [r.provinceCode, r.cost]));
}

/** Tarif > 0 disimpan, tarif 0/kosong menghapus provinsi itu (= pengiriman belum tersedia). */
export async function setShippingRates(rates: Record<string, number>): Promise<void> {
  const entries = Object.entries(rates);
  await prisma.$transaction([
    ...entries
      .filter(([, cost]) => cost > 0)
      .map(([provinceCode, cost]) =>
        prisma.shippingRate.upsert({ where: { provinceCode }, create: { provinceCode, cost }, update: { cost } }),
      ),
    prisma.shippingRate.deleteMany({
      where: { provinceCode: { in: entries.filter(([, cost]) => !(cost > 0)).map(([code]) => code) } },
    }),
  ]);
}
