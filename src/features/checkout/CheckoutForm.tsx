"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { getCartView, type CartViewItem } from "@/features/cart/actions";
import { useCart } from "@/features/cart/CartProvider";
import { formatRupiah } from "@/lib/format";
import type { DestinationView, ShippingOption } from "@/lib/shipping/types";
import { placeOrder, quoteShippingOptions, type QuoteResult } from "./actions";
import { CourierOptions } from "./CourierOptions";
import type { CheckoutDefaults } from "./defaults";
import { DestinationSearch } from "./DestinationSearch";
import type { PaymentMethod } from "./service";
import { choiceCls, Field, inputCls } from "./ui";

type Province = { code: string; name: string };

export function CheckoutForm({
  provinces,
  midtransReady,
  defaults,
  shippingMode,
}: {
  provinces: Province[];
  midtransReady: boolean;
  /** Isian awal untuk pembeli yang login (null = tamu). */
  defaults: CheckoutDefaults | null;
  /** "kurir" = pencarian tujuan + ongkir RajaOngkir; "standar" = provinsi + tarif tetap. */
  shippingMode: "kurir" | "standar";
}) {
  const cart = useCart();
  const router = useRouter();
  const [items, setItems] = useState<CartViewItem[] | null>(null);
  // Isian manual dipakai pada mode standar, atau saat pencarian tujuan sedang tidak tersedia.
  const [manual, setManual] = useState(shippingMode === "standar");
  const [destination, setDestination] = useState<DestinationView | null>(null);
  const [province, setProvince] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(midtransReady ? "MIDTRANS" : "MANUAL");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const errorRef = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(cart.lines);

  useEffect(() => {
    if (!cart.ready) return;
    getCartView(cart.lines).then((r) => setItems(r.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` mewakili isi cart.lines
  }, [key, cart.ready]);

  // Hitung ongkir setiap tujuan/provinsi atau isi tas berubah.
  const target = manual ? (province ? `p:${province}` : "") : destination ? `d:${destination.id}` : "";
  useEffect(() => {
    if (!target || !cart.ready) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    quoteShippingOptions({
      destinationId: manual ? undefined : destination?.id,
      postalCode: manual ? undefined : destination?.postalCode,
      provinceCode: manual ? province : destination?.provinceCode,
      lines: cart.lines,
    })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        // Pertahankan pilihan jika masih ada; jika tidak, pilih yang termurah.
        setShippingId((cur) => (cur && q.options.some((o) => o.id === cur) ? cur : (q.options[0]?.id ?? null)));
      })
      .catch(() => alive && setQuote({ options: [], fallback: true, error: "Gagal menghitung ongkir, coba lagi" }))
      .finally(() => alive && setQuoting(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `target` + `key` mewakili tujuan dan isi tas
  }, [target, key, cart.ready]);

  // Kesalahan saat kirim: pindahkan fokus ke ringkasan agar langsung terbaca (juga oleh pembaca layar).
  useEffect(() => {
    if (errors.length) errorRef.current?.focus();
  }, [errors]);

  if (!cart.ready || items === null) return <p className="mt-10 text-muted">Memuat…</p>;
  if (items.length === 0) {
    return (
      <div className="mt-10 border border-line py-16 text-center">
        <p className="text-muted">Tas belanjamu kosong.</p>
        <Link href="/katalog" className="mt-6 inline-block underline">
          Kembali ke katalog
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const options = quote?.options ?? [];
  const shipping: ShippingOption | null = options.find((o) => o.id === shippingId) ?? null;
  const total = subtotal + (shipping?.cost ?? 0);

  function submit(form: FormData) {
    // Cek yang tidak bisa ditangani atribut HTML; sisanya divalidasi ulang di server.
    const missing: string[] = [];
    if (!manual && !destination) missing.push("Pilih alamat tujuan dari hasil pencarian");
    if (manual && !province) missing.push("Pilih provinsi");
    if ((destination || province) && !shipping && !quoting) missing.push("Pilih layanan pengiriman");
    if (missing.length) {
      setErrors(missing);
      return;
    }
    if (!shipping) return; // ongkir masih dihitung

    setErrors([]);
    start(async () => {
      const area =
        !manual && destination
          ? {
              destinationId: destination.id,
              provinceCode: destination.provinceCode,
              city: destination.city,
              district: destination.district,
              postalCode: destination.postalCode,
            }
          : {
              provinceCode: province,
              city: String(form.get("city") ?? ""),
              district: String(form.get("district") ?? ""),
              postalCode: String(form.get("postalCode") ?? ""),
            };
      const r = await placeOrder({
        lines: cart.lines,
        customerName: String(form.get("customerName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        ...area,
        addressLine: String(form.get("addressLine") ?? ""),
        paymentMethod: method,
        shippingOptionId: shipping.id,
        expectedShippingCost: shipping.cost,
      });
      if (!r.ok) {
        setErrors(r.errors);
        // Ongkir berubah → muat ulang pilihan pengiriman.
        if (r.errors.some((e) => /ongkir/i.test(e))) setQuote(null);
        return;
      }
      cart.clear();
      const statusUrl = `/pesanan/${r.code}?hp=${encodeURIComponent(r.phone)}`;
      if (r.redirectUrl) window.location.href = r.redirectUrl;
      else router.push(statusUrl);
    });
  }

  const submitLabel = pending
    ? "Memproses…"
    : method === "MIDTRANS"
      ? shipping
        ? `Bayar ${formatRupiah(total)}`
        : "Bayar Sekarang"
      : shipping
        ? `Buat Pesanan · ${formatRupiah(total)}`
        : "Buat Pesanan";

  return (
    <form action={submit} className="mt-10 grid gap-10 md:grid-cols-[1fr_340px]">
      <div className="space-y-10">
        {errors.length > 0 && (
          <div ref={errorRef} tabIndex={-1} aria-labelledby="checkout-errors" className="border border-paper p-4 text-sm focus:outline-none">
            <p id="checkout-errors" className="font-semibold">
              Pesanan belum bisa dibuat:
            </p>
            <ul className="mt-2 list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <fieldset className="space-y-4">
          <legend className="display mb-4 text-xl">1. Kontak</legend>
          <Field label="Nama lengkap">
            <input name="customerName" required autoComplete="name" defaultValue={defaults?.customerName} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="No. HP / WhatsApp" hint="Dipakai untuk melacak pesanan.">
              <input name="phone" type="tel" required autoComplete="tel" placeholder="08…" defaultValue={defaults?.phone} className={inputCls} />
            </Field>
            <Field label="Email (opsional)">
              <input name="email" type="email" autoComplete="email" defaultValue={defaults?.email} className={inputCls} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="display mb-4 text-xl">2. Alamat Kirim</legend>
          {!manual ? (
            <DestinationSearch
              value={destination}
              onChange={(d) => {
                setDestination(d);
                setShippingId(null);
              }}
              onUnavailable={() => {
                setManual(true);
                setDestination(null);
              }}
            />
          ) : (
            <>
              {shippingMode === "kurir" && (
                <p className="border border-line p-3 text-xs text-muted">Pencarian alamat sedang tidak tersedia. Isi wilayah secara manual.</p>
              )}
              <Field label="Provinsi">
                <select
                  name="provinceCode"
                  required
                  autoComplete="address-level1"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setShippingId(null);
                  }}
                  className={inputCls}
                >
                  <option value="">Pilih provinsi…</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kota / Kabupaten">
                  <input name="city" required autoComplete="address-level2" className={inputCls} />
                </Field>
                <Field label="Kecamatan">
                  <input name="district" required autoComplete="address-level3" className={inputCls} />
                </Field>
              </div>
              <Field label="Kode pos">
                <input
                  name="postalCode"
                  required
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  autoComplete="postal-code"
                  className={`${inputCls} sm:max-w-40`}
                />
              </Field>
            </>
          )}
          <Field label="Alamat lengkap">
            <textarea
              name="addressLine"
              required
              rows={3}
              autoComplete="street-address"
              placeholder="Jalan, nomor rumah, RT/RW, patokan"
              defaultValue={defaults?.addressLine}
              className={inputCls}
            />
          </Field>
        </fieldset>

        <CourierOptions
          options={options}
          value={shippingId}
          onChange={setShippingId}
          loading={quoting}
          fallback={!!quote?.fallback && shippingMode === "kurir"}
          error={quote?.error}
          emptyHint={
            target
              ? manual
                ? "Pengiriman ke provinsi ini belum tersedia."
                : "Belum ada layanan pengiriman ke alamat ini."
              : manual
                ? "Pilih provinsi untuk melihat ongkir."
                : "Cari dan pilih alamat tujuan untuk melihat ongkir."
          }
        />

        <fieldset>
          <legend className="display mb-4 text-xl">4. Pembayaran</legend>
          <div className="grid gap-3">
            {[
              {
                v: "MIDTRANS" as const,
                t: "QRIS / Virtual Account",
                d: midtransReady ? "Bayar instan lewat QRIS atau VA bank. Konfirmasi otomatis." : "Belum tersedia.",
                off: !midtransReady,
              },
              { v: "MANUAL" as const, t: "Transfer Bank Manual", d: "Transfer ke rekening toko lalu unggah bukti. Dicek admin.", off: false },
            ].map((o) => (
              <label key={o.v} className={`${choiceCls} ${o.off ? "cursor-not-allowed opacity-40" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={o.v}
                  checked={method === o.v}
                  disabled={o.off}
                  onChange={() => setMethod(o.v)}
                  className="mt-1 accent-white"
                />
                <span>
                  <span className="block text-sm font-semibold">{o.t}</span>
                  <span className="mt-1 block text-xs text-muted">{o.d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="h-fit border border-line p-6 md:sticky md:top-24">
        <p className="eyebrow">Pesananmu</p>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3">
              <span>
                {i.productName} <span className="text-muted">({i.variantLabel}) ×{i.qty}</span>
              </span>
              <span className="whitespace-nowrap">{formatRupiah(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir</span>
            <span>{shipping ? formatRupiah(shipping.cost) : <span className="text-muted">{quoting ? "Menghitung…" : "Pilih alamat"}</span>}</span>
          </div>
          {shipping && <p className="text-xs text-muted">{shipping.label}</p>}
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>
        {/* Tidak di-disable sebelum valid: kesalahan ditampilkan saat dikirim. Di-disable hanya saat memproses. */}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-paper py-4 text-xs font-bold tracking-[0.25em] text-ink uppercase transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper disabled:cursor-wait disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <p className="mt-3 text-center text-[0.7rem] text-muted">Harga, stok, dan ongkir dicek ulang saat pesanan dibuat.</p>
      </aside>
    </form>
  );
}
