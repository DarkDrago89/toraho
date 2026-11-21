"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getCartView, type CartViewItem } from "@/features/cart/actions";
import { useCart } from "@/features/cart/CartProvider";
import { formatRupiah } from "@/lib/format";
import { placeOrder, quoteShippingOptions } from "./actions";
import type { ShippingOption } from "@/lib/shipping/types";
import type { CheckoutDefaults } from "./defaults";
import type { PaymentMethod } from "./service";

type Province = { code: string; name: string };

const inputCls =
  "mt-1.5 w-full border border-line bg-ink-2 px-3 py-3 text-sm text-paper placeholder:text-muted/60 focus:border-paper focus:outline-none";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs tracking-[0.15em] text-muted uppercase">
      {label}
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] tracking-normal normal-case">{hint}</span>}
    </label>
  );
}

export function CheckoutForm({
  provinces,
  midtransReady,
  defaults,
}: {
  provinces: Province[];
  midtransReady: boolean;
  /** Isian awal untuk pembeli yang login (null = tamu). */
  defaults: CheckoutDefaults | null;
}) {
  const cart = useCart();
  const router = useRouter();
  const [items, setItems] = useState<CartViewItem[] | null>(null);
  const [province, setProvince] = useState("");
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(midtransReady ? "MIDTRANS" : "MANUAL");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const key = JSON.stringify(cart.lines);

  useEffect(() => {
    if (!cart.ready) return;
    getCartView(cart.lines).then((r) => setItems(r.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` mewakili isi cart.lines
  }, [key, cart.ready]);

  const weight = items?.reduce((n, i) => n + i.weightGrams * i.qty, 0) ?? 0;
  useEffect(() => {
    if (!province) return setShipping(null);
    let alive = true;
    quoteShippingOptions({ provinceCode: province, lines: cart.lines }).then((q) => alive && setShipping(q.options[0] ?? null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` mewakili isi cart.lines
  }, [province, weight, key]);

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

  function submit(form: FormData) {
    setErrors([]);
    start(async () => {
      const r = await placeOrder({
        lines: cart.lines,
        customerName: String(form.get("customerName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        provinceCode: province,
        city: String(form.get("city") ?? ""),
        district: String(form.get("district") ?? ""),
        postalCode: String(form.get("postalCode") ?? ""),
        addressLine: String(form.get("addressLine") ?? ""),
        paymentMethod: method,
        shippingOptionId: shipping?.id ?? "",
        expectedShippingCost: shipping?.cost,
      });
      if (!r.ok) {
        setErrors(r.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      cart.clear();
      const statusUrl = `/pesanan/${r.code}?hp=${encodeURIComponent(r.phone)}`;
      if (r.redirectUrl) window.location.href = r.redirectUrl;
      else router.push(statusUrl);
    });
  }

  return (
    <form action={submit} className="mt-10 grid gap-10 md:grid-cols-[1fr_340px]">
      <div className="space-y-10">
        {errors.length > 0 && (
          <div role="alert" className="border border-paper p-4 text-sm">
            <p className="font-semibold">Pesanan belum bisa dibuat:</p>
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
          <Field label="Provinsi">
            <select required value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}>
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
            <input name="postalCode" required inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="postal-code" className={`${inputCls} sm:max-w-40`} />
          </Field>
          <Field label="Alamat lengkap">
            <textarea name="addressLine" required rows={3} autoComplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, patokan" defaultValue={defaults?.addressLine} className={inputCls} />
          </Field>
        </fieldset>

        <fieldset>
          <legend className="display mb-4 text-xl">3. Pembayaran</legend>
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
              <label
                key={o.v}
                className={`flex cursor-pointer gap-3 border p-4 transition ${method === o.v ? "border-paper" : "border-line"} ${o.off ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <input type="radio" name="paymentMethod" value={o.v} checked={method === o.v} disabled={o.off} onChange={() => setMethod(o.v)} className="mt-1 accent-white" />
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
            <span>{shipping ? formatRupiah(shipping.cost) : <span className="text-muted">Pilih provinsi</span>}</span>
          </div>
          {shipping && <p className="text-xs text-muted">{shipping.label}</p>}
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(subtotal + (shipping?.cost ?? 0))}</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={pending || !shipping}
          className="mt-6 w-full bg-paper py-4 text-xs font-bold tracking-[0.25em] text-ink uppercase transition hover:bg-white disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-muted"
        >
          {pending ? "Memproses…" : method === "MIDTRANS" ? "Bayar Sekarang" : "Buat Pesanan"}
        </button>
        <p className="mt-3 text-center text-[0.7rem] text-muted">Harga & stok dicek ulang saat pesanan dibuat.</p>
      </aside>
    </form>
  );
}
