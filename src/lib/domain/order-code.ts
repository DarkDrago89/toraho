// Tanpa 0/O, 1/I/L agar kode mudah dibacakan lewat telepon atau WA.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const wibDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

/** Kode pesanan yang ramah manusia, mis. "TRH-261121-7KQ4". Keunikan dijaga oleh constraint @unique di DB. */
export function generateOrderCode(now: Date, rand: () => number = Math.random): string {
  const p = Object.fromEntries(wibDate.formatToParts(now).map((x) => [x.type, x.value]));
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return `TRH-${p.year}${p.month}${p.day}-${suffix}`;
}
