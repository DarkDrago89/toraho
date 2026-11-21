/* eslint-disable @next/next/no-img-element -- thumbnail dari seed/upload/blob */
import Link from "next/link";
import { PageHeader, btnPrimary, fieldCls } from "@/components/ui/admin";
import { listAdminCategories, listAdminProducts } from "@/features/admin-catalog/service";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produk" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; kategori?: string }> }) {
  const sp = await searchParams;
  const [rows, cats] = await Promise.all([listAdminProducts({ q: sp.q, categoryId: sp.kategori }), listAdminCategories()]);

  return (
    <>
      <PageHeader
        eyebrow="Katalog"
        title="Produk"
        action={
          <Link href="/admin/produk/baru" className={btnPrimary}>
            + Produk baru
          </Link>
        }
      />
      <form className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Cari nama produk…" className={`${fieldCls} w-full max-w-xs`} />
        <select name="kategori" defaultValue={sp.kategori ?? ""} className={fieldCls}>
          <option value="">Semua kategori</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="border border-line px-4 text-xs tracking-[0.15em] uppercase hover:border-paper">Filter</button>
      </form>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Kategori</th>
              <th className="p-3 text-right">Harga</th>
              <th className="p-3 text-right">Stok</th>
              <th className="p-3 text-right">Terjual</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-ink-2">
                <td className="p-3">
                  <Link href={`/admin/produk/${r.id}`} className="flex items-center gap-3 hover:underline">
                    <span className="block h-12 w-9 shrink-0 overflow-hidden border border-line bg-ink-3">
                      {r.image && <img src={r.image} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="font-semibold">{r.name}</span>
                  </Link>
                </td>
                <td className="p-3 text-muted">{r.categoryName}</td>
                <td className="p-3 text-right tabular-nums">{formatRupiah(r.price)}</td>
                <td className={`p-3 text-right tabular-nums ${r.totalStock === 0 ? "text-red-300" : r.totalStock <= 3 ? "text-amber-300" : ""}`}>{r.totalStock}</td>
                <td className="p-3 text-right tabular-nums">{r.sold}</td>
                <td className="p-3 text-xs">
                  {r.isVisible ? "Tampil" : <span className="text-muted">Tersembunyi</span>}
                  {r.isFeatured && <span className="ml-2 border border-line px-1.5 py-0.5 text-[0.6rem] tracking-[0.15em] uppercase">Unggulan</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">
                  Tidak ada produk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
