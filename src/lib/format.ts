const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 489000 → "Rp 489.000" */
export function formatRupiah(n: number): string {
  return `Rp ${rupiah.format(n)}`;
}

const dateParts = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Tanggal dalam WIB, format dd/mm/yyyy. */
export function formatDate(d: Date): string {
  const p = Object.fromEntries(dateParts.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}`;
}

const timeParts = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Tanggal + jam WIB, mis. "22/11/2026 03.00". */
export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${timeParts.format(d)}`;
}
