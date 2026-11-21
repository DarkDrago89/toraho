import { prisma } from "@/lib/db";

let seq = 0;
/** Akhiran unik agar tes bisa diulang tanpa reset database. */
export function uid(prefix = "t") {
  seq++;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export async function makeCategory(over: { name?: string; isVisible?: boolean } = {}) {
  const slug = uid("kat");
  return prisma.category.create({ data: { name: over.name ?? "Kategori Tes", slug, isVisible: over.isVisible ?? true } });
}

type ProductOpts = {
  name?: string;
  price?: number;
  compareAtPrice?: number | null;
  stock?: number;
  weightGrams?: number;
  isVisible?: boolean;
  isFeatured?: boolean;
  categoryId?: string;
  /** Label varian tambahan; default satu varian "M". */
  variants?: { label: string; stock: number }[];
};

/** Produk + varian. Mengembalikan varian pertama sebagai `variant` agar tes ringkas. */
export async function makeProduct(o: ProductOpts = {}) {
  const categoryId = o.categoryId ?? (await makeCategory()).id;
  const slug = uid("prod");
  const variants = o.variants ?? [{ label: "M", stock: o.stock ?? 10 }];
  const product = await prisma.product.create({
    data: {
      categoryId,
      name: o.name ?? "Produk Tes",
      slug,
      price: o.price ?? 100000,
      compareAtPrice: o.compareAtPrice ?? null,
      weightGrams: o.weightGrams ?? 300,
      isVisible: o.isVisible ?? true,
      isFeatured: o.isFeatured ?? false,
      variants: {
        create: variants.map((v, i) => ({ label: v.label, stock: v.stock, sku: `${slug}-${v.label}`, sortOrder: i })),
      },
    },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });
  return { product, variant: product.variants[0], variants: product.variants, categoryId };
}

export async function stockOf(variantId: string) {
  return (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;
}
