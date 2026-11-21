import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/ui/ProductCard";
import { listProducts, listVisibleCategories, type CatalogSort } from "@/features/catalog/service";
import { SortSelect } from "./SortSelect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Katalog" };

const SORTS: CatalogSort[] = ["terbaru", "harga-naik", "harga-turun"];

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ kategori?: string; urut?: string }> }) {
  const sp = await searchParams;
  const sort = SORTS.includes(sp.urut as CatalogSort) ? (sp.urut as CatalogSort) : "terbaru";
  const [categories, products] = await Promise.all([
    listVisibleCategories(),
    listProducts({ categorySlug: sp.kategori, sort }),
  ]);
  const active = categories.find((c) => c.slug === sp.kategori);

  const chip = (slug: string | undefined, label: string) => {
    const on = (slug ?? null) === (active?.slug ?? null);
    const qs = new URLSearchParams({ ...(slug ? { kategori: slug } : {}), ...(sort !== "terbaru" ? { urut: sort } : {}) });
    return (
      <Link
        key={label}
        href={`/katalog${qs.size ? `?${qs}` : ""}`}
        aria-current={on ? "page" : undefined}
        className={`shrink-0 border px-4 py-2 text-xs tracking-[0.2em] uppercase transition ${
          on ? "border-paper bg-paper text-ink" : "border-line text-muted hover:border-paper hover:text-paper"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="eyebrow">Katalog</p>
      <h1 className="display mt-2 text-4xl sm:text-6xl">{active?.name ?? "Semua Produk"}</h1>

      <div className="mt-8 flex flex-col gap-4 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter kategori" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {chip(undefined, "Semua")}
          {categories.map((c) => chip(c.slug, c.name))}
        </nav>
        <SortSelect value={sort} />
      </div>

      <p className="mt-6 text-xs text-muted">{products.length} produk</p>
      <div className="mt-4">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="border border-line py-20 text-center text-muted">Belum ada produk di kategori ini.</p>
        )}
      </div>
    </div>
  );
}
