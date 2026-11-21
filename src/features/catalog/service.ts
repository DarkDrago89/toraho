import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  soldOut: boolean;
  categoryName: string;
  categorySlug: string;
};

export type ProductDetail = ProductCardData & {
  description: string;
  weightGrams: number;
  images: string[];
  variants: { id: string; label: string; stock: number }[];
};

export type CatalogSort = "terbaru" | "harga-naik" | "harga-turun";

/** Produk tampil = produk terlihat di kategori terlihat. */
const VISIBLE: Prisma.ProductWhereInput = { isVisible: true, category: { isVisible: true } };
const ACTIVE_VARIANTS = { where: { isArchived: false }, orderBy: { sortOrder: "asc" as const } };

const cardInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  variants: ACTIVE_VARIANTS,
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function toCard(p: CardRow): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: p.images[0]?.url ?? null,
    soldOut: p.variants.every((v) => v.stock <= 0),
    categoryName: p.category.name,
    categorySlug: p.category.slug,
  };
}

const ORDER_BY: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput> = {
  terbaru: { createdAt: "desc" },
  "harga-naik": { price: "asc" },
  "harga-turun": { price: "desc" },
};

export async function listProducts({ categorySlug, sort = "terbaru" }: { categorySlug?: string; sort?: CatalogSort }) {
  const rows = await prisma.product.findMany({
    where: { ...VISIBLE, ...(categorySlug ? { category: { slug: categorySlug, isVisible: true } } : {}) },
    include: cardInclude,
    orderBy: [ORDER_BY[sort] ?? ORDER_BY.terbaru, { id: "asc" }],
  });
  return rows.map(toCard);
}

export async function listFeatured(limit = 6) {
  const rows = await prisma.product.findMany({
    where: { ...VISIBLE, isFeatured: true },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toCard);
}

export async function listVisibleCategories() {
  return prisma.category.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const p = await prisma.product.findFirst({
    where: { ...VISIBLE, slug },
    include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: ACTIVE_VARIANTS },
  });
  if (!p) return null;
  return {
    ...toCard({ ...p, images: p.images.slice(0, 1) }),
    description: p.description,
    weightGrams: p.weightGrams,
    images: p.images.map((i) => i.url),
    variants: p.variants.map((v) => ({ id: v.id, label: v.label, stock: v.stock })),
  };
}

export type CartVariant = {
  variantId: string;
  productName: string;
  variantLabel: string;
  image: string | null;
  price: number;
  stock: number;
  weightGrams: number;
  slug: string;
};

/** Data terkini dari server untuk isi keranjang. Varian yang tidak bisa dibeli dilaporkan di `missing`. */
export async function getVariantsForCart(ids: string[]): Promise<{ available: CartVariant[]; missing: string[] }> {
  const rows = await prisma.variant.findMany({
    where: { id: { in: ids }, isArchived: false, product: VISIBLE },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
  });
  const found = new Set(rows.map((r) => r.id));
  return {
    available: rows.map((v) => ({
      variantId: v.id,
      productName: v.product.name,
      variantLabel: v.label,
      image: v.product.images[0]?.url ?? null,
      price: v.product.price,
      stock: v.stock,
      weightGrams: v.product.weightGrams,
      slug: v.product.slug,
    })),
    missing: ids.filter((id) => !found.has(id)),
  };
}
