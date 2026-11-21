"use server";

import { getVariantsForCart, type CartVariant } from "@/features/catalog/service";
import type { CartLine } from "./cart-store";

export type CartViewItem = CartVariant & { qty: number };

/** Data keranjang terkini dari server. Varian yang sudah tidak dijual dilaporkan di `missing`. */
export async function getCartView(lines: CartLine[]): Promise<{ items: CartViewItem[]; missing: string[] }> {
  const safe = lines.filter((l) => typeof l.variantId === "string").slice(0, 50);
  if (safe.length === 0) return { items: [], missing: [] };
  const { available, missing } = await getVariantsForCart(safe.map((l) => l.variantId));
  const byId = new Map(available.map((v) => [v.variantId, v]));
  const items = safe.flatMap((l) => {
    const v = byId.get(l.variantId);
    return v ? [{ ...v, qty: l.qty }] : [];
  });
  return { items, missing };
}
