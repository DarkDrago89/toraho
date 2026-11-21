import Link from "next/link";
import type { ProductCardData } from "@/features/catalog/service";
import { formatRupiah } from "@/lib/format";
import { ProductImage } from "./ProductImage";

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <Link href={`/produk/${p.slug}`} className="group block">
      <div className="relative">
        <ProductImage src={p.image} alt={p.name} className={p.soldOut ? "opacity-50" : ""} />
        {p.soldOut && (
          <span className="absolute top-3 left-3 bg-paper px-2 py-1 text-[0.65rem] font-bold tracking-[0.2em] text-ink">HABIS</span>
        )}
        {!p.soldOut && p.compareAtPrice && (
          <span className="absolute top-3 left-3 border border-paper px-2 py-1 text-[0.65rem] font-bold tracking-[0.2em]">SALE</span>
        )}
      </div>
      <p className="eyebrow mt-3">{p.categoryName}</p>
      <h3 className="mt-1 text-sm font-semibold tracking-wide uppercase group-hover:underline">{p.name}</h3>
      <p className="mt-1 text-sm">
        {formatRupiah(p.price)}
        {p.compareAtPrice && <span className="ml-2 text-muted line-through">{formatRupiah(p.compareAtPrice)}</span>}
      </p>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
