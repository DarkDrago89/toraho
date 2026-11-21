import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/domain/phone";
import { isProvinceCode } from "@/lib/shipping/provinces";

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

export type SaveResult = { ok: true } | { ok: false; errors: string[] };

/** Validasi + simpan pengaturan dari form admin. */
export async function saveSettings(input: StoreSettings): Promise<SaveResult> {
  const errors: string[] = [];
  const hours = Number(input.paymentWindowHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 72) errors.push("Batas waktu bayar harus 1–72 jam");

  let whatsapp = "";
  if (input.whatsapp.trim()) {
    const n = normalizePhone(input.whatsapp);
    if (!n) errors.push("Nomor WhatsApp tidak valid");
    else whatsapp = n;
  }

  const bankAccounts: BankAccount[] = [];
  for (const b of input.bankAccounts) {
    const bank = b.bank.trim().toUpperCase();
    const number = b.number.replace(/[\s-]/g, "");
    const holder = b.holder.trim();
    if (!bank && !number && !holder) continue; // baris kosong diabaikan
    if (!bank || !holder) errors.push("Nama bank dan nama pemilik rekening wajib diisi");
    if (!/^\d{5,20}$/.test(number)) errors.push("Nomor rekening hanya boleh angka");
    bankAccounts.push({ bank, number, holder });
  }

  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  await updateSettings({ paymentWindowHours: hours, whatsapp, bankAccounts });
  return { ok: true };
}

/** Validasi + simpan tarif ongkir dari form admin (0 = provinsi belum dilayani). */
export async function saveShippingRates(rates: Record<string, number>): Promise<SaveResult> {
  const unknown = Object.keys(rates).filter((c) => !isProvinceCode(c));
  if (unknown.length) return { ok: false, errors: [`Kode provinsi tidak dikenal: ${unknown.join(", ")}`] };
  if (Object.values(rates).some((v) => !Number.isInteger(v) || v < 0)) return { ok: false, errors: ["Tarif ongkir harus angka bulat ≥ 0"] };
  await setShippingRates(rates);
  return { ok: true };
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

/** Asal pengiriman untuk RajaOngkir: id + label dari hasil pencarian tujuan. null = belum diatur. */
export type ShippingOrigin = { id: string; label: string };

const ORIGIN_KEY = "shippingOrigin";

export async function getShippingOrigin(): Promise<ShippingOrigin | null> {
  const row = await prisma.setting.findUnique({ where: { key: ORIGIN_KEY } });
  const v = row?.value as Partial<ShippingOrigin> | null | undefined;
  return v?.id && v.label ? { id: v.id, label: v.label } : null;
}

export async function saveShippingOrigin(origin: ShippingOrigin | null): Promise<SaveResult> {
  if (origin === null) {
    await prisma.setting.deleteMany({ where: { key: ORIGIN_KEY } });
    return { ok: true };
  }
  const id = String(origin.id ?? "").trim();
  const label = String(origin.label ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !label || label.length > 300) {
    return { ok: false, errors: ["Pilih kecamatan asal pengiriman dari hasil pencarian"] };
  }
  const value = { id, label };
  await prisma.setting.upsert({ where: { key: ORIGIN_KEY }, create: { key: ORIGIN_KEY, value }, update: { value } });
  return { ok: true };
}
