import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, btnGhost } from "@/components/ui/admin";
import { getAdminProduct, listAdminCategories } from "@/features/admin-catalog/service";
import { ProductForm } from "@/features/admin-catalog/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ubah Produk" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, cats] = await Promise.all([getAdminProduct(id), listAdminCategories()]);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Ubah produk"
        title={p.name}
        action={
          <Link href={`/produk/${p.slug}`} target="_blank" className={btnGhost}>
            Lihat di toko ↗
          </Link>
        }
      />
      <ProductForm
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          id: p.id,
          categoryId: p.categoryId,
          name: p.name,
          description: p.description,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          weightGrams: p.weightGrams,
          isVisible: p.isVisible,
          isFeatured: p.isFeatured,
          variants: p.variants.map((v) => ({ id: v.id, label: v.label, sku: v.sku, stock: v.stock })),
          imageUrls: p.images.map((i) => i.url),
        }}
      />
    </>
  );
}
