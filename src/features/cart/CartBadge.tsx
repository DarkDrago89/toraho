"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartBadge() {
  const { count, ready } = useCart();
  return (
    <Link href="/keranjang" className="flex items-center gap-2 text-xs tracking-[0.25em] uppercase" aria-label={`Tas belanja, ${count} barang`}>
      Tas
      <span className="grid h-6 min-w-6 place-items-center border border-paper px-1 text-[0.7rem] tracking-normal tabular-nums">
        {ready ? count : 0}
      </span>
    </Link>
  );
}
