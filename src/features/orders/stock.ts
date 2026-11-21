import type { Tx } from "@/lib/db";

export class StockError extends Error {}

export type StockLine = { variantId: string; qty: number; label: string };

/**
 * Menahan stok untuk setiap baris secara atomik: UPDATE … WHERE stock >= qty.
 * Postgres mengunci baris dan mengevaluasi ulang kondisi, sehingga dua checkout bersamaan
 * tidak bisa sama-sama mengambil unit terakhir. Gagal satu baris → lempar StockError
 * (pemanggil berada di dalam transaksi, jadi semua baris ikut dibatalkan).
 */
export async function holdStock(tx: Tx, lines: StockLine[]): Promise<void> {
  for (const l of lines) {
    const res = await tx.variant.updateMany({
      where: { id: l.variantId, stock: { gte: l.qty } },
      data: { stock: { decrement: l.qty } },
    });
    if (res.count === 0) throw new StockError(`Stok ${l.label} tidak cukup`);
  }
}

/**
 * Mengembalikan stok pesanan jika (dan hanya jika) pesanan itu sedang menahan stok.
 * Flag stockHeld diubah dengan kondisi yang sama, jadi panggilan ganda tidak menambah stok dua kali.
 * Mengembalikan true jika stok benar-benar dikembalikan.
 */
export async function releaseStock(tx: Tx, orderId: string): Promise<boolean> {
  const flipped = await tx.order.updateMany({ where: { id: orderId, stockHeld: true }, data: { stockHeld: false } });
  if (flipped.count === 0) return false;
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
  }
  return true;
}

/** Menahan ulang stok untuk pesanan yang stoknya sudah dilepas (mis. bayar setelah kedaluwarsa). */
export async function reholdStock(tx: Tx, orderId: string): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  await holdStock(
    tx,
    items.map((i) => ({ variantId: i.variantId, qty: i.qty, label: `${i.productName} (${i.variantLabel})` })),
  );
  await tx.order.update({ where: { id: orderId }, data: { stockHeld: true } });
}
