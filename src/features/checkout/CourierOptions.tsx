"use client";

import { formatRupiah } from "@/lib/format";
import type { ShippingOption } from "@/lib/shipping/types";
import { choiceCls } from "./ui";

type Props = {
  options: ShippingOption[];
  value: string | null;
  onChange: (id: string) => void;
  loading: boolean;
  /** RajaOngkir aktif tetapi gagal → yang tampil tarif standar. */
  fallback: boolean;
  error?: string;
  /** Pesan saat tujuan belum dipilih. */
  emptyHint: string;
};

/** Pilihan layanan pengiriman: semua opsi terlihat sebagai radio, urut dari termurah. */
export function CourierOptions({ options, value, onChange, loading, fallback, error, emptyHint }: Props) {
  return (
    <fieldset aria-busy={loading || undefined}>
      <legend className="display mb-4 text-xl">3. Pengiriman</legend>
      {loading ? (
        <p className="text-sm text-muted">Menghitung ongkir…</p>
      ) : error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted">{emptyHint}</p>
      ) : (
        <>
          {fallback && <p className="mb-3 text-xs text-muted">Tarif kurir sedang tidak tersedia, jadi dipakai tarif standar toko.</p>}
          <div className="grid gap-2">
            {options.map((o) => (
              <label key={o.id} className={choiceCls}>
                <input
                  type="radio"
                  name="shippingOptionId"
                  value={o.id}
                  checked={value === o.id}
                  onChange={() => onChange(o.id)}
                  className="mt-1 accent-white"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{o.label}</span>
                  {(o.description || o.etd) && (
                    <span className="mt-0.5 block text-xs text-muted">
                      {[o.description, o.etd && `Estimasi ${o.etd}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="text-sm whitespace-nowrap tabular-nums">{formatRupiah(o.cost)}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
