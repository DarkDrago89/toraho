import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { listAdminCategories } from "@/features/admin-catalog/service";
import { ProductForm } from "@/features/admin-catalog/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produk Baru" };

export default async function NewProductPage() {
  const cats = await listAdminCategories();
  if (cats.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Produk" title="Produk Baru" />
        <p className="text-muted">
          Buat kategori dulu di{" "}
          <Link href="/admin/kategori" className="underline">
            halaman Kategori
          </Link>
          .
        </p>
      </>
    );
  }
  return (
    <>
      <PageHeader eyebrow="Produk" title="Produk Baru" />
      <ProductForm categories={cats.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
