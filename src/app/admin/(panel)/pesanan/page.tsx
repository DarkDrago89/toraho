import Link from "next/link";
import { PageHeader, fieldCls } from "@/components/ui/admin";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { countByStatus, listOrders } from "@/features/orders/admin";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/domain/order-status";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan" };

const TABS: (OrderStatus | "")[] = ["", "PERLU_TINDAKAN", "MENUNGGU_VERIFIKASI", "MENUNGGU_BAYAR", "DIBAYAR", "DIKEMAS", "DIKIRIM", "SELESAI", "BATAL", "KEDALUWARSA"];

function parseDate(s?: string) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return new Date(`${s}T00:00:00+07:00`);
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; dari?: string; sampai?: string }> }) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const from = parseDate(sp.dari);
  const toDay = parseDate(sp.sampai);
  const to = toDay ? new Date(toDay.getTime() + 86400_000) : undefined;
  const [orders, counts] = await Promise.all([listOrders({ status, q: sp.q, from, to }), countByStatus()]);

  const href = (s: string) => {
    const qs = new URLSearchParams({ ...(s ? { status: s } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.dari ? { dari: sp.dari } : {}), ...(sp.sampai ? { sampai: sp.sampai } : {}) });
    return `/admin/pesanan${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Penjualan" title="Pesanan" />

      <nav aria-label="Filter status" className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {TABS.map((s) => {
          const on = (status ?? "") === s;
          const n = s ? counts[s] ?? 0 : undefined;
          const urgent = (s === "PERLU_TINDAKAN" || s === "MENUNGGU_VERIFIKASI") && (n ?? 0) > 0;
          return (
            <Link
              key={s || "semua"}
              href={href(s)}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 border px-3 py-1.5 text-[0.65rem] tracking-[0.15em] uppercase ${on ? "border-paper bg-paper text-ink" : "border-line text-muted hover:text-paper"}`}
            >
              {s ? STATUS_LABEL[s] : "Semua"}
              {n !== undefined && n > 0 && <span className={`ml-1.5 ${urgent && !on ? "text-amber-300" : ""}`}>{n}</span>}
            </Link>
          );
        })}
      </nav>

      <form className="mb-6 flex flex-wrap items-end gap-2 text-xs">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={sp.q} placeholder="Kode, nama, atau HP…" className={`${fieldCls} w-full max-w-xs`} />
        <label className="text-muted">
          Dari <input type="date" name="dari" defaultValue={sp.dari} className={`${fieldCls} ml-1`} />
        </label>
        <label className="text-muted">
          Sampai <input type="date" name="sampai" defaultValue={sp.sampai} className={`${fieldCls} ml-1`} />
        </label>
        <button className="border border-line px-4 py-2.5 tracking-[0.15em] uppercase hover:border-paper">Cari</button>
      </form>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Pembeli</th>
              <th className="p-3">Bayar</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Dibuat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-ink-2">
                <td className="p-3">
                  <Link href={`/admin/pesanan/${o.id}`} className="font-mono text-xs font-semibold hover:underline">
                    {o.code}
                  </Link>
                </td>
                <td className="p-3">
                  {o.customerName}
                  <span className="block text-xs text-muted">{o.phone}</span>
                </td>
                <td className="p-3 text-xs text-muted">{o.paymentMethod === "MIDTRANS" ? "Midtrans" : "Transfer"}</td>
                <td className="p-3 text-right tabular-nums">{formatRupiah(o.total)}</td>
                <td className="p-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="p-3 text-xs text-muted">{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">
                  Tidak ada pesanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
