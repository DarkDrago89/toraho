"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btnGhost, btnPrimary, ErrorList, fieldCls, inputCls, Label } from "@/components/ui/admin";
import { JAVA_PROVINCES } from "@/lib/shipping/provinces";
import { DestinationSearch } from "@/features/checkout/DestinationSearch";
import { courierLabel } from "@/lib/shipping/describe";
import type { DestinationView } from "@/lib/shipping/types";
import { saveSettingsAction, saveShippingOriginAction, saveShippingRatesAction } from "./actions";
import type { ShippingOrigin, StoreSettings } from "./service";

function useSaver() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const run = (fn: () => Promise<{ ok: true } | { ok: false; errors: string[] }>) =>
    start(async () => {
      setErrors([]);
      setSaved(false);
      const r = await fn();
      if (!r.ok) return setErrors(r.errors);
      setSaved(true);
      router.refresh();
    });
  return { pending, errors, saved, run };
}

export function StoreSettingsForm({ initial }: { initial: StoreSettings }) {
  const [s, setS] = useState(initial);
  const { pending, errors, saved, run } = useSaver();
  const setBank = (i: number, k: "bank" | "number" | "holder", v: string) =>
    setS({ ...s, bankAccounts: s.bankAccounts.map((b, j) => (j === i ? { ...b, [k]: v } : b)) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSettingsAction(s));
      }}
      className="space-y-6"
    >
      <section className="space-y-4 border border-line p-5">
        <h2 className="display text-lg">Pembayaran</h2>
        <Label text="Batas waktu bayar (jam)" hint="Berlaku untuk Midtrans dan batas unggah bukti transfer manual. Stok ditahan selama waktu ini.">
          <input type="number" min={1} max={72} value={s.paymentWindowHours} onChange={(e) => setS({ ...s, paymentWindowHours: Number(e.target.value) })} className={`${inputCls} max-w-32`} />
        </Label>
        <div>
          <p className="text-xs tracking-[0.15em] text-muted uppercase">Rekening transfer manual</p>
          <div className="mt-2 space-y-2">
            {s.bankAccounts.map((b, i) => (
              <div key={i} className="grid grid-cols-[90px_1fr_1fr_28px] gap-2">
                <input aria-label="Bank" placeholder="BCA" value={b.bank} onChange={(e) => setBank(i, "bank", e.target.value)} className={`${fieldCls} min-w-0`} />
                <input aria-label="Nomor rekening" inputMode="numeric" placeholder="Nomor rekening" value={b.number} onChange={(e) => setBank(i, "number", e.target.value)} className={`${fieldCls} min-w-0 tabular-nums`} />
                <input aria-label="Atas nama" placeholder="Atas nama" value={b.holder} onChange={(e) => setBank(i, "holder", e.target.value)} className={`${fieldCls} min-w-0`} />
                <button type="button" aria-label="Hapus rekening" onClick={() => setS({ ...s, bankAccounts: s.bankAccounts.filter((_, j) => j !== i) })} className="text-muted hover:text-paper">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setS({ ...s, bankAccounts: [...s.bankAccounts, { bank: "", number: "", holder: "" }] })} className={`${btnGhost} mt-3`}>
            + Rekening
          </button>
        </div>
      </section>

      <section className="space-y-4 border border-line p-5">
        <h2 className="display text-lg">Kontak</h2>
        <Label text="Nomor WhatsApp toko" hint="Tampil di footer dan halaman status pesanan.">
          <input inputMode="tel" placeholder="08…" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} className={`${inputCls} max-w-xs`} />
        </Label>
      </section>

      <ErrorList errors={errors} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan…" : "Simpan Pengaturan"}
        </button>
        {saved && <span role="status" className="text-sm text-emerald-300">Tersimpan ✓</span>}
      </div>
    </form>
  );
}

export function ShippingRatesForm({ provinces, initial }: { provinces: { code: string; name: string }[]; initial: Record<string, number> }) {
  const [rates, setRates] = useState<Record<string, number>>(() => Object.fromEntries(provinces.map((p) => [p.code, initial[p.code] ?? 0])));
  const [bulk, setBulk] = useState("");
  const { pending, errors, saved, run } = useSaver();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveShippingRatesAction(rates));
      }}
      className="space-y-4 border border-line p-5"
    >
      <h2 className="display text-lg">Ongkir per Provinsi</h2>
      <p className="text-xs text-muted">Satu tarif tetap per pesanan. Isi 0 jika belum melayani provinsi tersebut (tidak bisa dipilih saat checkout).</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input type="number" min={0} placeholder="Rp" value={bulk} onChange={(e) => setBulk(e.target.value)} className={`${fieldCls} w-28`} aria-label="Tarif massal" />
        <button type="button" disabled={!bulk} onClick={() => setRates({ ...rates, ...Object.fromEntries(JAVA_PROVINCES.map((c) => [c, Number(bulk)])) })} className={btnGhost}>
          Isi semua provinsi Jawa
        </button>
        <button type="button" disabled={!bulk} onClick={() => setRates(Object.fromEntries(Object.entries(rates).map(([c, v]) => [c, v > 0 ? v : Number(bulk)])))} className={btnGhost}>
          Isi provinsi yang masih 0
        </button>
      </div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {provinces.map((p) => (
          <label key={p.code} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm">
            <span className={rates[p.code] > 0 ? "" : "text-muted"}>{p.name}</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={rates[p.code]}
              onChange={(e) => setRates({ ...rates, [p.code]: Math.max(0, Number(e.target.value) || 0) })}
              className={`${fieldCls} w-28 py-1.5 text-right tabular-nums`}
            />
          </label>
        ))}
      </div>
      <ErrorList errors={errors} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan…" : "Simpan Tarif"}
        </button>
        {saved && <span role="status" className="text-sm text-emerald-300">Tersimpan ✓</span>}
      </div>
    </form>
  );
}

/** Ongkir kurir (RajaOngkir): status + asal pengiriman, dipilih lewat pencarian yang sama dengan checkout. */
export function ShippingOriginForm({ initial, apiKeySet, couriers }: { initial: ShippingOrigin | null; apiKeySet: boolean; couriers: string[] }) {
  const [picked, setPicked] = useState<DestinationView | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { pending, errors, saved, run } = useSaver();
  const active = apiKeySet && !!initial;

  return (
    <section className="space-y-4 border border-line p-5 text-sm">
      <h2 className="display text-lg">Ongkir Kurir (RajaOngkir)</h2>
      <dl className="space-y-1">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Status</dt>
          <dd className={active ? "text-emerald-300" : "text-amber-300"}>
            {active ? "● Aktif" : !apiKeySet ? "● Belum diatur (RAJAONGKIR_API_KEY kosong)" : "● Pilih asal pengiriman"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Kurir</dt>
          <dd>{couriers.map(courierLabel).join(", ")}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Asal pengiriman</dt>
          <dd className="text-right">{initial?.label ?? "—"}</dd>
        </div>
      </dl>

      {apiKeySet &&
        (unavailable ? (
          <p className="border border-line p-3 text-xs text-amber-300">
            Pencarian RajaOngkir gagal. Periksa API key dan kuota di dashboard Komerce, lalu muat ulang halaman ini.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (picked) run(() => saveShippingOriginAction({ id: picked.id, label: picked.label }));
            }}
            className="space-y-3"
          >
            <DestinationSearch
              value={picked}
              onChange={setPicked}
              onUnavailable={() => setUnavailable(true)}
              label={initial ? "Ganti asal pengiriman" : "Cari kecamatan asal pengiriman"}
              hint="Kecamatan/kelurahan tempat paket dikirim, mis. Coblong atau 40132."
            />
            <ErrorList errors={errors} />
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={pending || !picked} className={btnPrimary}>
                {pending ? "Menyimpan…" : "Simpan Asal"}
              </button>
              {initial && (
                <button type="button" disabled={pending} onClick={() => run(() => saveShippingOriginAction(null))} className={btnGhost}>
                  Hapus asal
                </button>
              )}
              {saved && (
                <span role="status" className="text-sm text-emerald-300">
                  Tersimpan ✓
                </span>
              )}
            </div>
          </form>
        ))}

      <p className="text-xs text-muted">
        Tanpa API key atau asal pengiriman, checkout memakai tarif per provinsi. Tarif per provinsi juga menjadi cadangan saat RajaOngkir gagal
        atau kuota habis. Panduan: docs/rajaongkir.md
      </p>
    </section>
  );
}
