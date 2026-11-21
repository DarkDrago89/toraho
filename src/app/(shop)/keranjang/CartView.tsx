"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ui/ProductImage";
import { getCartView, type CartViewItem } from "@/features/cart/actions";
import { useCart } from "@/features/cart/CartProvider";
import { formatRupiah } from "@/lib/format";

export function CartView() {
  const cart = useCart();
  const [items, setItems] = useState<CartViewItem[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const key = JSON.stringify(cart.lines);

  useEffect(() => {
    if (!cart.ready) return;
    let alive = true;
    getCartView(cart.lines).then((r) => {
      if (!alive) return;
      setItems(r.items);
      setMissing(r.missing);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` mewakili isi cart.lines
  }, [key, cart.ready]);

  if (!cart.ready || items === null) return <p className="mt-10 text-muted">Memuat tas…</p>;

  if (items.length === 0 && missing.length === 0) {
    return (
      <div className="mt-10 border border-line py-20 text-center">
        <p className="text-muted">Tas belanjamu masih kosong.</p>
        <Link href="/katalog" className="mt-6 inline-block bg-paper px-8 py-3 text-xs font-bold tracking-[0.25em] text-ink uppercase">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  const overStock = items.filter((i) => i.qty > i.stock);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const blocked = missing.length > 0 || overStock.length > 0 || items.length === 0;

  return (
    <div className="mt-10 grid gap-10 md:grid-cols-[1fr_300px]">
      <div>
        {missing.length > 0 && (
          <div role="alert" className="mb-6 border border-paper p-4 text-sm">
            {missing.length} barang di tas sudah tidak dijual.{" "}
            <button type="button" className="underline" onClick={() => missing.forEach((id) => cart.remove(id))}>
              Hapus dari tas
            </button>
          </div>
        )}
        <ul className="divide-y divide-line border-y border-line">
          {items.map((i) => {
            const over = i.qty > i.stock;
            return (
              <li key={i.variantId} className="flex gap-4 py-5">
                <Link href={`/produk/${i.slug}`} className="w-20 shrink-0 sm:w-24">
                  <ProductImage src={i.image} alt={i.productName} />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link href={`/produk/${i.slug}`} className="text-sm font-semibold tracking-wide uppercase hover:underline">
                        {i.productName}
                      </Link>
                      <p className="mt-1 text-xs text-muted">Ukuran {i.variantLabel}</p>
                    </div>
                    <p className="text-sm whitespace-nowrap">{formatRupiah(i.price * i.qty)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center border border-line">
                      <button
                        type="button"
                        aria-label="Kurangi"
                        className="h-9 w-9 hover:bg-ink-3"
                        onClick={() => cart.setQty(i.variantId, i.qty - 1)}
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm tabular-nums">{i.qty}</span>
                      <button
                        type="button"
                        aria-label="Tambah"
                        disabled={i.qty >= i.stock}
                        className="h-9 w-9 hover:bg-ink-3 disabled:opacity-30"
                        onClick={() => cart.setQty(i.variantId, i.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="text-xs text-muted underline hover:text-paper" onClick={() => cart.remove(i.variantId)}>
                      Hapus
                    </button>
                  </div>
                  {over && (
                    <p role="alert" className="mt-2 text-xs">
                      {i.stock === 0 ? "Stok habis." : `Stok tinggal ${i.stock}.`}{" "}
                      <button type="button" className="underline" onClick={() => cart.setQty(i.variantId, i.stock)}>
                        Sesuaikan
                      </button>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit border border-line p-6">
        <p className="eyebrow">Ringkasan</p>
        <div className="mt-4 flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">Ongkir dihitung saat checkout.</p>
        {blocked ? (
          <p className="mt-6 block w-full bg-ink-3 py-4 text-center text-xs font-bold tracking-[0.25em] text-muted uppercase">
            Perbaiki isi tas dulu
          </p>
        ) : (
          <Link
            href="/checkout"
            className="mt-6 block w-full bg-paper py-4 text-center text-xs font-bold tracking-[0.25em] text-ink uppercase hover:bg-white"
          >
            Lanjut ke Checkout
          </Link>
        )}
      </aside>
    </div>
  );
}
