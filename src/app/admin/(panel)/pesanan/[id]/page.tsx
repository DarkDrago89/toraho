/* eslint-disable @next/next/no-img-element -- bukti transfer dari upload/blob */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/admin";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAdminOrder, needsRefund } from "@/features/orders/admin";
import { OrderActions } from "@/features/orders/OrderActions";
import { toWaNumber } from "@/lib/domain/phone";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { describeShipping, formatAddress } from "@/lib/shipping/describe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail Pesanan" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, canRefund] = await Promise.all([getAdminOrder(id), needsRefund(id)]);
  if (!o) notFound();

  const wa = `https://wa.me/${toWaNumber(o.phone)}?text=${encodeURIComponent(`Halo ${o.customerName}, ini Toraho mengenai pesanan ${o.code}.`)}`;

  return (
    <>
      <Link href="/admin/pesanan" className="eyebrow hover:text-paper">
        ← Semua pesanan
      </Link>
      <PageHeader title={o.code} action={<StatusBadge status={o.status} />} />

      {o.adminNote && (
        <div className={`mb-6 border p-4 text-sm ${o.status === "PERLU_TINDAKAN" ? "border-red-400/60 bg-red-950/30 text-red-200" : "border-line"}`}>
          <p className="eyebrow mb-1">Catatan</p>
          {o.adminNote}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="border border-line p-5">
            <h2 className="display mb-4 text-lg">Barang</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      {i.productName} <span className="text-muted">({i.variantLabel})</span>
                    </td>
                    <td className="py-2 text-right text-muted tabular-nums">
                      {i.qty} × {formatRupiah(i.price)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatRupiah(i.qty * i.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatRupiah(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ongkir ({(o.weightGrams / 1000).toFixed(2)} kg)</dt><dd>{formatRupiah(o.shippingCost)}</dd></div>
              {describeShipping(o) && (
                <div className="flex justify-between"><dt className="text-muted">Kirim dengan</dt><dd className="font-semibold">{describeShipping(o)}</dd></div>
              )}
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatRupiah(o.total)}</dd></div>
            </dl>
          </section>

          {o.paymentMethod === "MANUAL" && (
            <section className="border border-line p-5">
              <h2 className="display mb-4 text-lg">Bukti Transfer</h2>
              {o.proofs.length === 0 ? (
                <p className="text-sm text-muted">Belum ada bukti diunggah.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {o.proofs.map((p, i) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="group block">
                      <img src={p.url} alt={`Bukti transfer ${i + 1}`} className="aspect-[3/4] w-full border border-line object-cover group-hover:border-paper" />
                      <span className="mt-1 block text-xs text-muted">
                        {i === 0 ? "Terbaru · " : ""}
                        {formatDateTime(p.createdAt)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
              {o.rejectReason && <p className="mt-3 text-xs text-muted">Alasan tolak terakhir: {o.rejectReason}</p>}
            </section>
          )}

          {o.paymentEvents.length > 0 && (
            <section className="border border-line p-5">
              <h2 className="display mb-3 text-lg">Riwayat Midtrans</h2>
              <ul className="space-y-1 font-mono text-xs text-muted">
                {o.paymentEvents.map((e) => (
                  <li key={e.id}>
                    {formatDateTime(e.createdAt)} · {e.status} · {e.externalId}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <OrderActions
            order={{
              id: o.id,
              status: o.status,
              paymentMethod: o.paymentMethod,
              paidAt: o.paidAt?.toISOString() ?? null,
              canRefund,
              refunded: o.refunded,
              trackingNumber: o.trackingNumber,
            }}
          />

          <section className="border border-line p-5 text-sm">
            <h2 className="eyebrow mb-3">Pembeli</h2>
            <p className="font-semibold">{o.customerName}</p>
            <p className="text-muted">{o.phone}{o.email ? ` · ${o.email}` : ""}</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block border border-line px-3 py-1.5 text-xs tracking-[0.15em] uppercase hover:border-paper">
              Chat WhatsApp ↗
            </a>
            <h2 className="eyebrow mt-5 mb-2">Alamat kirim</h2>
            <p className="text-muted">
              {formatAddress(o)}
            </p>
            {o.trackingNumber && (
              <p className="mt-3">
                Resi: <span className="font-mono">{o.trackingNumber}</span>
              </p>
            )}
          </section>

          <section className="border border-line p-5 text-xs text-muted">
            <p>Dibuat {formatDateTime(o.createdAt)}</p>
            <p>Bayar {o.paymentMethod === "MIDTRANS" ? "Midtrans" : "transfer manual"} · batas {formatDateTime(o.paymentDeadline)}</p>
            {o.paidAt && <p>Lunas {formatDateTime(o.paidAt)}</p>}
            <p>Stok {o.stockHeld ? "sedang ditahan" : "tidak ditahan"}</p>
          </section>
        </div>
      </div>
    </>
  );
}
