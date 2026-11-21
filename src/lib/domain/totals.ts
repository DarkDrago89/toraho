export type TotalsLine = { price: number; qty: number; weightGrams: number };
export type Totals = { subtotal: number; shippingCost: number; total: number; weightGrams: number };

/** Total pesanan. Biaya Midtrans ditanggung toko, jadi total = subtotal + ongkir. */
export function computeTotals(items: TotalsLine[], shippingCost: number): Totals {
  let subtotal = 0;
  let weightGrams = 0;
  for (const it of items) {
    subtotal += it.price * it.qty;
    weightGrams += it.weightGrams * it.qty;
  }
  return { subtotal, shippingCost, total: subtotal + shippingCost, weightGrams };
}
