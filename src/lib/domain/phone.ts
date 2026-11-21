/**
 * Menormalkan nomor HP Indonesia ke bentuk "08…". Menerima +62 / 62 / 0, spasi, dan tanda hubung.
 * Mengembalikan null jika bukan nomor seluler yang masuk akal (10–13 digit setelah normalisasi).
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = "0" + digits.slice(2);
  if (!digits.startsWith("08")) return null;
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

/** "0812…" → "62812…" untuk tautan wa.me. */
export function toWaNumber(phone: string): string {
  const n = normalizePhone(phone) ?? phone.replace(/\D/g, "");
  return n.startsWith("0") ? "62" + n.slice(1) : n;
}
