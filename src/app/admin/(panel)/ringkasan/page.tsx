import Link from "next/link";
import { PageHeader, fieldCls } from "@/components/ui/admin";
import { countByStatus } from "@/features/orders/admin";
import { getLowStock, getSalesReport, resolvePeriod } from "@/features/sales/service";
import { SalesChart } from "@/features/sales/SalesChart";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ringkasan" };

const PRESETS = [
  { v: "7", label: "7 hari" },
  { v: "30", label: "30 hari" },
  { v: "bulan", label: "Bulan ini" },
];

export default async function SummaryPage({ searchParams }: { searchParams: Promise<{ periode?: string; dari?: string; sampai?: string }> }) {
  const sp = await searchParams;
  const period = resolvePeriod(sp.periode, new Date(), { dari: sp.dari, sampai: sp.sampai });
  const [report, low, counts] = await Promise.all([getSalesReport(period), getLowStock(3), countByStatus()]);
  const toVerify = counts.MENUNGGU_VERIFIKASI ?? 0;
  const needsAction = counts.PERLU_TINDAKAN ?? 0;
  const toShip = (counts.DIBAYAR ?? 0) + (counts.DIKEMAS ?? 0);
  const activePreset = sp.periode === "rentang" ? "rentang" : PRESETS.some((p) => p.v === sp.periode) ? sp.periode : "30";

  return (
    <>
      <PageHeader eyebrow={period.label} title="Ringkasan" />

      {/* Filter periode: satu baris di atas semua angka */}
      <div className="mb-8 flex flex-wrap items-end gap-2 text-xs">
        {PRESETS.map((p) => (
          <Link
            key={p.v}
            href={`/admin/ringkasan?periode=${p.v}`}
            aria-current={activePreset === p.v ? "page" : undefined}
            className={`border px-3 py-2 tracking-[0.15em] uppercase ${activePreset === p.v ? "border-paper bg-paper text-ink" : "border-line text-muted hover:text-paper"}`}
          >
            {p.label}
          </Link>
        ))}
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="periode" value="rentang" />
          <input type="date" name="dari" defaultValue={sp.dari} aria-label="Dari tanggal" className={fieldCls} />
          <input type="date" name="sampai" defaultValue={sp.sampai} aria-label="Sampai tanggal" className={fieldCls} />
          <button className={`border px-3 py-2.5 tracking-[0.15em] uppercase ${activePreset === "rentang" ? "border-paper" : "border-line text-muted hover:text-paper"}`}>Terapkan</button>
        </form>
      </div>

      {(toVerify > 0 || needsAction > 0 || toShip > 0) && (
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {needsAction > 0 && (
            <Link href="/admin/pesanan?status=PERLU_TINDAKAN" className="border border-red-400/60 bg-red-950/30 p-4 hover:border-red-300">
              <p className="text-xs tracking-[0.15em] text-red-300 uppercase">⚠ Perlu tindakan</p>
              <p className="display mt-1 text-3xl">{needsAction}</p>
            </Link>
          )}
          {toVerify > 0 && (
            <Link href="/admin/pesanan?status=MENUNGGU_VERIFIKASI" className="border border-amber-400/50 p-4 hover:border-amber-300">
              <p className="text-xs tracking-[0.15em] text-amber-300 uppercase">● Bukti transfer menunggu dicek</p>
              <p className="display mt-1 text-3xl">{toVerify}</p>
            </Link>
          )}
          {toShip > 0 && (
            <Link href="/admin/pesanan?status=DIBAYAR" className="border border-line p-4 hover:border-paper">
              <p className="text-xs tracking-[0.15em] text-muted uppercase">Siap dikemas / dikirim</p>
              <p className="display mt-1 text-3xl">{toShip}</p>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        {[
          ["Omzet", formatRupiah(report.revenue), "tanpa ongkir"],
          ["Pesanan lunas", String(report.orders), ""],
          ["Unit terjual", String(report.units), ""],
          ["Rata-rata pesanan", formatRupiah(report.avgOrder), ""],
        ].map(([label, value, hint]) => (
          <div key={label} className="bg-ink p-5">
            <p className="eyebrow">{label}</p>
            <p className="display mt-2 text-2xl tabular-nums sm:text-3xl">{value}</p>
            {hint && <p className="mt-1 text-[0.7rem] text-muted">{hint}</p>}
          </div>
        ))}
      </div>

      <section className="mt-8 border border-line p-5">
        <h2 className="display text-lg">Omzet harian</h2>
        <div className="mt-4">
          <SalesChart data={report.daily} />
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <RankTable title="Produk terlaris" rows={report.byProduct.slice(0, 10).map((p) => [p.productName, p.units, p.revenue])} />
        <RankTable title="Per kategori" rows={report.byCategory.map((c) => [c.categoryName, c.units, c.revenue])} />
        <RankTable title="Per ukuran" rows={report.byVariant.slice(0, 10).map((v) => [`${v.productName} · ${v.variantLabel}`, v.units, null])} />
        <section className="border border-line p-5">
          <h2 className="display text-lg">Stok menipis (≤ 3)</h2>
          {low.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Semua stok aman.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line text-sm">
              {low.map((v) => (
                <li key={v.variantId} className="flex justify-between gap-3 py-2">
                  <Link href={`/admin/produk/${v.productId}`} className="hover:underline">
                    {v.productName} <span className="text-muted">({v.label})</span>
                  </Link>
                  <span className={`tabular-nums ${v.stock === 0 ? "text-red-300" : "text-amber-300"}`}>{v.stock === 0 ? "Habis" : v.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function RankTable({ title, rows }: { title: string; rows: [string, number, number | null][] }) {
  return (
    <section className="border border-line p-5">
      <h2 className="display text-lg">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Belum ada penjualan di periode ini.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            <tr>
              <th className="pb-2 font-normal">Nama</th>
              <th className="pb-2 text-right font-normal">Unit</th>
              {rows[0][2] !== null && <th className="pb-2 text-right font-normal">Omzet</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([name, units, rev]) => (
              <tr key={name}>
                <td className="py-2">{name}</td>
                <td className="py-2 text-right tabular-nums">{units}</td>
                {rev !== null && <td className="py-2 text-right tabular-nums">{formatRupiah(rev)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
