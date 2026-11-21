/**
 * Keranjang hanya menyimpan ID varian + jumlah. Nama, harga, dan stok selalu diambil dari server,
 * sehingga harga tidak bisa dimanipulasi dari browser dan keranjang lama tetap aman.
 */
export type CartLine = { variantId: string; qty: number };

export const CART_STORAGE_KEY = "toraho.cart.v1";

export function addLine(lines: CartLine[], variantId: string, qty: number): CartLine[] {
  const existing = lines.find((l) => l.variantId === variantId);
  if (!existing) return [...lines, { variantId, qty }];
  return lines.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l));
}

export function setQty(lines: CartLine[], variantId: string, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, variantId);
  return lines.map((l) => (l.variantId === variantId ? { ...l, qty } : l));
}

export function removeLine(lines: CartLine[], variantId: string): CartLine[] {
  return lines.filter((l) => l.variantId !== variantId);
}

function isLine(x: unknown): x is CartLine {
  if (typeof x !== "object" || x === null) return false;
  const l = x as Record<string, unknown>;
  return typeof l.variantId === "string" && typeof l.qty === "number" && Number.isInteger(l.qty) && l.qty > 0;
}

/** Membaca isi localStorage. Data rusak atau tidak dikenali menghasilkan keranjang kosong. */
export function parseCart(raw: unknown): CartLine[] {
  if (typeof raw !== "string") return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isLine).map((l) => ({ variantId: l.variantId, qty: l.qty })) : [];
  } catch {
    return [];
  }
}
