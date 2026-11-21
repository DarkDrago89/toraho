export const ORDER_STATUSES = [
  "MENUNGGU_BAYAR",
  "MENUNGGU_VERIFIKASI",
  "DIBAYAR",
  "DIKEMAS",
  "DIKIRIM",
  "SELESAI",
  "BATAL",
  "KEDALUWARSA",
  "PERLU_TINDAKAN",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  MENUNGGU_BAYAR: "Menunggu Bayar",
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  DIBAYAR: "Dibayar",
  DIKEMAS: "Dikemas",
  DIKIRIM: "Dikirim",
  SELESAI: "Selesai",
  BATAL: "Batal",
  KEDALUWARSA: "Kedaluwarsa",
  PERLU_TINDAKAN: "Perlu Tindakan",
};

/**
 * Peta transisi status pesanan: status asal → status tujuan yang boleh.
 * Semua perubahan status (webhook Midtrans, aksi admin, unggah bukti, job kedaluwarsa)
 * wajib lolos `canTransition`, jadi tabel inilah "aturan main" toko.
 *
 * Aturan dari spec (bagian 2.10 dan 8b):
 * - Unggah bukti transfer: MENUNGGU_BAYAR → MENUNGGU_VERIFIKASI
 * - Admin konfirmasi / tolak bukti: → DIBAYAR / kembali ke MENUNGGU_BAYAR
 * - Webhook Midtrans lunas: MENUNGGU_BAYAR → DIBAYAR; nominal tidak cocok → PERLU_TINDAKAN
 * - Lewat batas waktu: MENUNGGU_BAYAR → KEDALUWARSA (bukti yang sudah diunggah TIDAK kedaluwarsa)
 * - Bayar setelah kedaluwarsa: KEDALUWARSA → DIBAYAR (stok ada) atau PERLU_TINDAKAN (stok habis)
 * - Admin menyelesaikan PERLU_TINDAKAN: → DIBAYAR atau BATAL
 * - Alur kirim: DIBAYAR → DIKEMAS → DIKIRIM → SELESAI
 * - Batal: dari MENUNGGU_BAYAR, MENUNGGU_VERIFIKASI, DIBAYAR, DIKEMAS (bukan dari DIKIRIM/SELESAI)
 * - SELESAI dan BATAL adalah status akhir.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  MENUNGGU_BAYAR: ["MENUNGGU_VERIFIKASI", "DIBAYAR", "KEDALUWARSA", "BATAL", "PERLU_TINDAKAN"],
  MENUNGGU_VERIFIKASI: ["DIBAYAR", "MENUNGGU_BAYAR", "BATAL"],
  DIBAYAR: ["DIKEMAS", "BATAL"],
  DIKEMAS: ["DIKIRIM", "BATAL"],
  DIKIRIM: ["SELESAI"],
  SELESAI: [],
  BATAL: [],
  KEDALUWARSA: ["DIBAYAR", "PERLU_TINDAKAN"],
  PERLU_TINDAKAN: ["DIBAYAR", "BATAL"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Hanya pesanan yang uangnya sudah diterima yang dihitung sebagai "terjual" dan omzet. */
export const SOLD_STATUSES = ["DIBAYAR", "DIKEMAS", "DIKIRIM", "SELESAI"] as const satisfies readonly OrderStatus[];

export function countsAsSold(s: OrderStatus): boolean {
  return (SOLD_STATUSES as readonly OrderStatus[]).includes(s);
}

/** Status yang masih menunggu uang masuk (stok sedang ditahan untuk pembeli). */
export const AWAITING_PAYMENT_STATUSES = ["MENUNGGU_BAYAR", "MENUNGGU_VERIFIKASI"] as const satisfies readonly OrderStatus[];
