import { PageHeader } from "@/components/ui/admin";
import { listAdminCategories } from "@/features/admin-catalog/service";
import { CategoryManager } from "@/features/admin-catalog/CategoryManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kategori" };

export default async function CategoriesPage() {
  const cats = await listAdminCategories();
  return (
    <>
      <PageHeader eyebrow="Katalog" title="Kategori" />
      <CategoryManager
        categories={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, isVisible: c.isVisible, sortOrder: c.sortOrder, products: c._count.products }))}
      />
    </>
  );
}
