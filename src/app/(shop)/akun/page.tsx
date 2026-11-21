import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { customerSignOutAction } from "@/features/customer-auth/actions";
import { listCustomerOrders } from "@/features/orders/service";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { formatDate, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Akun Saya", robots: { index: false } };

export default async function AccountPage() {
  const session = await auth();
  // Middleware sudah menjaga halaman ini; pengecekan ulang untuk jaga-jaga.
  if (session?.user?.role !== "customer") redirect("/masuk?next=%2Fakun");
  const orders = await listCustomerOrders(session.user.id);
  const hasUnlinked = orders.some((o) => !o.linked);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="eyebrow">Akun</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">{session.user.name ?? "Akun Saya"}</h1>
          <p className="mt-1 text-sm text-muted">{session.user.email}</p>
        </div>
        <form action={customerSignOutAction}>
          <button
            type="submit"
            className="border border-line px-5 py-3 text-xs tracking-[0.25em] uppercase transition hover:border-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            Keluar
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="mt-12 border border-line py-16 text-center">
          <p className="text-muted">Belum ada pesanan di akun ini.</p>
          <Link href="/katalog" className="mt-6 inline-block underline underline-offset-4">
            Mulai belanja
          </Link>
        </div>
      ) : (
        <div role="region" aria-labelledby="riwayat" tabIndex={0} className="mt-12 overflow-x-auto focus-visible:outline-2 focus-visible:outline-paper">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption id="riwayat" className="display mb-4 text-left text-xl">
              Riwayat pesanan
            </caption>
            <thead className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
              <tr className="border-b border-line">
                <th scope="col" className="py-3 pr-4 font-normal">Kode</th>
                <th scope="col" className="py-3 pr-4 font-normal">Tanggal</th>
                <th scope="col" className="py-3 pr-4 font-normal">Status</th>
                <th scope="col" className="py-3 pr-4 text-right font-normal">Barang</th>
                <th scope="col" className="py-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.code} className="border-b border-line">
                  <td className="py-4 pr-4">
                    {o.linked ? (
                      <Link href={`/pesanan/${o.code}`} className="font-semibold underline-offset-4 hover:underline">
                        {o.code}
                      </Link>
                    ) : (
                      <Link href={`/lacak?kode=${encodeURIComponent(o.code)}`} className="font-semibold underline-offset-4 hover:underline">
                        {o.code}
                        <span className="block text-[0.7rem] font-normal text-muted">Buka dengan nomor HP</span>
                      </Link>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-muted">{formatDate(o.createdAt)}</td>
                  <td className="py-4 pr-4">{STATUS_LABEL[o.status]}</td>
                  <td className="py-4 pr-4 text-right tabular-nums">{o.itemCount}</td>
                  <td className="py-4 text-right tabular-nums">{formatRupiah(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasUnlinked && (
        <p className="mt-6 text-sm text-muted">
          Pesanan bertanda &ldquo;Buka dengan nomor HP&rdquo; dibuat tanpa login memakai emailmu. Masukkan nomor HP yang dipakai saat
          checkout sekali saja, dan pesanan itu akan tersimpan di akunmu.
        </p>
      )}
    </div>
  );
}
