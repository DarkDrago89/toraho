import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "@/components/ui/ProductImage";
import { KanjiAccent } from "@/components/brand/KanjiAccent";
import { AddToCart } from "@/features/cart/AddToCart";
import { getProductBySlug } from "@/features/catalog/service";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Produk tidak ditemukan" };
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    openGraph: { title: `${p.name} · Toraho`, images: p.image && !p.image.endsWith(".svg") ? [p.image] : ["/brand/logo-white.png"] },
  };
}

export default async function ProductPage({ params }: Params) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="eyebrow flex gap-2">
        <Link href="/katalog" className="hover:text-paper">Katalog</Link>
        <span>/</span>
        <Link href={`/katalog?kategori=${p.categorySlug}`} className="hover:text-paper">{p.categoryName}</Link>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="grid gap-3">
          {(p.images.length ? p.images : [null]).map((src, i) => (
            <ProductImage key={i} src={src} alt={`${p.name} foto ${i + 1}`} eager={i === 0} />
          ))}
        </div>

        <div className="relative md:sticky md:top-24 md:self-start">
          <KanjiAccent className="absolute -top-2 right-0 text-5xl" />
          <h1 className="display pr-14 text-4xl sm:text-5xl">{p.name}</h1>
          <p className="mt-4 text-2xl">
            {formatRupiah(p.price)}
            {p.compareAtPrice && <span className="ml-3 text-base text-muted line-through">{formatRupiah(p.compareAtPrice)}</span>}
          </p>

          <div className="mt-8">
            <AddToCart variants={p.variants} productName={p.name} />
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <p className="eyebrow mb-3">Deskripsi</p>
            <p className="leading-relaxed whitespace-pre-line text-paper/85">{p.description}</p>
            <p className="mt-4 text-xs text-muted">Berat kirim ± {p.weightGrams} gram</p>
          </div>
        </div>
      </div>
    </div>
  );
}
