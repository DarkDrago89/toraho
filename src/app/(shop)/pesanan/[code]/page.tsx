import type { Metadata } from "next";
import Link from "next/link";
import { getOrderForBuyer } from "@/features/orders/service";
import { payNowAction } from "@/features/orders/actions";
import { getSettings } from "@/features/settings/service";
import { StatusStepper } from "@/features/orders/buyer/StatusStepper";
import { Countdown, CopyButton } from "@/features/orders/buyer/Countdown";
import { ProofUploadForm } from "@/features/orders/buyer/ProofUploadForm";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { toWaNumber } from "@/lib/domain/phone";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { provinceName } from "@/lib/shipping/provinces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Status Pesanan", robots: { index: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ hp?: string; gagal?: string }> };

export default async function OrderStatusPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { hp = "", gagal } = await searchParams;
  const [order, settings] = await Promise.all([getOrderForBuyer(code, hp), getSettings()]);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-3xl">Pesanan tidak ditemukan</h1>
        <p className="mt-3 text-muted">Pastikan kode pesanan dan nomor HP sesuai.</p>
        <Link href="/lacak" className="mt-8 inline-block bg-paper px-8 py-3 text-xs font-bold tracking-[0.25em] text-ink uppercase">
          Lacak Pesanan
        </Link>
      </div>
    );
  }

  const awaitingPayment = order.status === "MENUNGGU_BAYAR";
  const wa = settings.whatsapp ? `https://wa.me/${toWaNumber(settings.whatsapp)}?text=${encodeURIComponent(`Halo Toraho, saya mau tanya pesanan ${order.code}`)}` : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="eyebrow">Pesanan · {formatDateTime(order.createdAt)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="display text-3xl sm:text-4xl">{order.code}</h1>
        <CopyButton text={order.code} />
      </div>
      <p className="mt-2 text-sm text-muted">
        Status: <span className="text-paper">{STATUS_LABEL[order.status]}</span>
      </p>

      <div className="mt-8">
        <StatusStepper status={order.status} />
      </div>

      {/* Midtrans: tombol bayar */}
      {awaitingPayment && order.paymentMethod === "MIDTRANS" && (
        <section className="mt-10 border border-line p-6">
          <h2 className="display text-xl">Selesaikan Pembayaran</h2>
          <p className="mt-2 text-sm text-muted">
            Bayar dengan QRIS atau Virtual Account sebelum <span className="text-paper">{formatDateTime(order.paymentDeadline)}</span> (
            <Countdown deadline={order.paymentDeadline.toISOString()} />
            ).
          </p>
          {gagal && <p role="alert" className="mt-3 text-sm">Halaman pembayaran belum bisa dibuka. Coba lagi sebentar, atau hubungi kami.</p>}
          <form action={payNowAction} className="mt-5">
            <input type="hidden" name="code" value={order.code} />
            <input type="hidden" name="phone" value={order.phone} />
            <button className="w-full bg-paper py-4 text-xs font-bold tracking-[0.25em] text-ink uppercase hover:bg-white">
              Bayar Sekarang · {formatRupiah(order.total)}
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">Status berubah otomatis setelah pembayaran diterima. Muat ulang halaman ini setelah membayar.</p>
        </section>
      )}

      {/* Transfer manual */}
      {order.paymentMethod === "MANUAL" && (awaitingPayment || order.status === "MENUNGGU_VERIFIKASI") && (
        <section className="mt-10 border border-line p-6">
          <h2 className="display text-xl">{awaitingPayment ? "Transfer Manual" : "Bukti Sedang Dicek"}</h2>
          {order.status === "MENUNGGU_VERIFIKASI" ? (
            <p className="mt-2 text-sm text-muted">Bukti transfer sudah kami terima dan sedang dicek admin. Halaman ini akan berubah setelah dikonfirmasi.</p>
          ) : (
            <>
              {order.rejectReason && (
                <div role="alert" className="mt-4 border border-paper p-3 text-sm">
                  Bukti sebelumnya ditolak: <span className="font-semibold">{order.rejectReason}</span>. Silakan unggah ulang.
                </div>
              )}
              <p className="mt-3 text-sm text-muted">
                Transfer <span className="text-paper">tepat</span> sebesar:
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="display text-3xl">{formatRupiah(order.total)}</span>
                <CopyButton text={String(order.total)} />
              </div>
              <p className="mt-2 text-sm text-muted">
                sebelum <span className="text-paper">{formatDateTime(order.paymentDeadline)}</span> (
                <Countdown deadline={order.paymentDeadline.toISOString()} />) ke salah satu rekening:
              </p>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {settings.bankAccounts.length === 0 && <li className="py-3 text-sm text-muted">Rekening belum diatur. Hubungi kami lewat WhatsApp.</li>}
                {settings.bankAccounts.map((b) => (
                  <li key={b.bank + b.number} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="font-bold">{b.bank}</span> <span className="tabular-nums">{b.number}</span>
                      <span className="block text-xs text-muted">a.n. {b.holder}</span>
                    </span>
                    <CopyButton text={b.number} />
                  </li>
                ))}
              </ul>
              <ProofUploadForm code={order.code} phone={order.phone} />
            </>
          )}
        </section>
      )}

      {order.trackingNumber && (
        <section className="mt-10 border border-paper p-6">
          <p className="eyebrow">Nomor resi</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="display text-2xl tabular-nums">{order.trackingNumber}</span>
            <CopyButton text={order.trackingNumber} />
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="eyebrow mb-3">Barang</p>
          <ul className="space-y-2 text-sm">
            {order.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3">
                <span>
                  {i.productName} <span className="text-muted">({i.variantLabel}) ×{i.qty}</span>
                </span>
                <span>{formatRupiah(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Ongkir</span><span>{formatRupiah(order.shippingCost)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatRupiah(order.total)}</span></div>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3">Dikirim ke</p>
          <p className="text-sm">{order.customerName}</p>
          <p className="text-sm text-muted">{order.phone}</p>
          <p className="mt-2 text-sm text-muted">
            {order.addressLine}, {order.district}, {order.city}, {provinceName(order.provinceCode)} {order.postalCode}
          </p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6 text-xs tracking-[0.2em] uppercase">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="border border-paper px-5 py-3 hover:bg-paper hover:text-ink">
            Tanya via WhatsApp
          </a>
        )}
        <Link href="/katalog" className="border border-line px-5 py-3 text-muted hover:border-paper hover:text-paper">
          Lanjut Belanja
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted">Simpan kode pesanan & nomor HP-mu untuk melacak pesanan di halaman Lacak Pesanan.</p>
    </div>
  );
}
