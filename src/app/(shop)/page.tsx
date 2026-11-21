import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { KanjiAccent } from "@/components/brand/KanjiAccent";
import { ProductGrid } from "@/components/ui/ProductCard";
import { listFeatured, listVisibleCategories } from "@/features/catalog/service";

export const dynamic = "force-dynamic";

const CATEGORY_KANJI: Record<string, string> = { jaket: "虎", kaos: "火", merch: "紋" };

export default async function HomePage() {
  const [featured, categories] = await Promise.all([listFeatured(8), listVisibleCategories()]);

  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_50%_25%,#2a2a2a_0%,#0b0b0b_65%)]">
        <KanjiAccent className="absolute top-8 right-3 text-6xl sm:right-10 sm:text-9xl" />
        <KanjiAccent text="虎火商店" className="absolute bottom-10 left-3 hidden text-2xl sm:block" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:pt-20">
          <Logo variant="full" priority className="w-60 sm:w-80" />
          <p className="eyebrow mt-6">Koleksi 2026 · 虎 harimau × 火 api</p>
          <h1 className="display mt-4 text-5xl sm:text-7xl">
            Api di dalam
            <br />
            harimau
          </h1>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/katalog" className="bg-paper px-8 py-3.5 text-xs font-bold tracking-[0.25em] text-ink uppercase transition hover:bg-white">
              Belanja Sekarang
            </Link>
            <Link href="/katalog?kategori=jaket" className="border border-paper px-8 py-3.5 text-xs font-bold tracking-[0.25em] uppercase transition hover:bg-paper hover:text-ink">
              Lihat Jaket
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl sm:text-4xl">Kategori</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/katalog?kategori=${c.slug}`}
                className="group relative flex aspect-[4/3] items-end overflow-hidden border border-line bg-ink-2 p-5 transition hover:border-paper"
              >
                <span aria-hidden className="absolute -top-4 right-2 font-[family-name:var(--font-jp)] text-[9rem] leading-none text-paper opacity-[0.07] transition group-hover:opacity-15">
                  {CATEGORY_KANJI[c.slug] ?? "虎"}
                </span>
                <span className="display text-2xl">{c.name}</span>
                <span className="ml-auto text-xs tracking-[0.25em] text-muted uppercase group-hover:text-paper">Lihat →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-3xl sm:text-4xl">Pilihan Toraho</h2>
            <Link href="/katalog" className="text-xs tracking-[0.25em] text-muted uppercase hover:text-paper">
              Semua produk →
            </Link>
          </div>
          <div className="mt-8">
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 text-sm sm:grid-cols-3">
          {[
            ["Bayar mudah", "QRIS, Virtual Account semua bank, atau transfer manual."],
            ["Ukuran lengkap", "S sampai XXL. Stok per ukuran selalu ditampilkan."],
            ["Lacak pesanan", "Cek status dan nomor resi kapan saja dengan kode pesanan."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="display text-lg">{t}</p>
              <p className="mt-2 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
