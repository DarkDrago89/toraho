"use client";

import { useState } from "react";

type Variant = { id: string; label: string; stock: number };

/** Pemilih ukuran. Varian stok 0 dicoret dan tidak bisa dipilih. */
export function AddToCart({ variants }: { variants: Variant[]; productName: string }) {
  const firstAvailable = variants.find((v) => v.stock > 0);
  const [selected, setSelected] = useState<string | undefined>(variants.length === 1 ? firstAvailable?.id : undefined);
  const current = variants.find((v) => v.id === selected);
  const soldOut = !firstAvailable;

  return (
    <div>
      {!(variants.length === 1 && variants[0].label === "All size") && (
        <fieldset>
          <legend className="eyebrow mb-3">Pilih ukuran</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock <= 0;
              const on = v.id === selected;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  aria-pressed={on}
                  onClick={() => setSelected(v.id)}
                  className={`min-w-14 border px-4 py-3 text-sm font-semibold transition ${
                    on ? "border-paper bg-paper text-ink" : "border-line hover:border-paper"
                  } ${out ? "cursor-not-allowed text-muted line-through opacity-50 hover:border-line" : ""}`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {current && current.stock <= 3 && <p className="mt-3 text-xs text-muted">Sisa {current.stock} lagi</p>}

      <button
        type="button"
        disabled={soldOut || !current}
        className="mt-6 w-full bg-paper py-4 text-xs font-bold tracking-[0.25em] text-ink uppercase transition hover:bg-white disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-muted"
      >
        {soldOut ? "Stok habis" : current ? "Tambah ke Tas" : "Pilih ukuran dulu"}
      </button>
    </div>
  );
}
