"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addLine, CART_STORAGE_KEY, parseCart, removeLine, setQty as setLineQty, type CartLine } from "./cart-store";

type CartCtx = {
  lines: CartLine[];
  /** false sampai isi localStorage dibaca (hindari kedip "keranjang kosong"). */
  ready: boolean;
  count: number;
  add: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

function save(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Mode privat / storage diblokir: keranjang tetap jalan selama tab terbuka.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial: CartLine[] = [];
    try {
      initial = parseCart(localStorage.getItem(CART_STORAGE_KEY));
    } catch {}
    setLines(initial);
    setReady(true);

    // Sinkron antar tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) setLines(parseCart(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (l: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.qty, 0),
      add: (id, qty = 1) => update((l) => addLine(l, id, qty)),
      setQty: (id, qty) => update((l) => setLineQty(l, id, qty)),
      remove: (id) => update((l) => removeLine(l, id)),
      clear: () => update(() => []),
    }),
    [lines, ready, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>");
  return ctx;
}
