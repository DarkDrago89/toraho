import { z } from "zod";
import { prisma } from "@/lib/db";
import { SOLD_STATUSES } from "@/lib/domain/order-status";

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

async function uniqueSlug(kind: "category" | "product", name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  const taken = async (slug: string) => {
    const row =
      kind === "category"
        ? await prisma.category.findUnique({ where: { slug }, select: { id: true } })
        : await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    return !!row && row.id !== excludeId;
  };
  if (!(await taken(base))) return base;
  for (let i = 2; ; i++) if (!(await taken(`${base}-${i}`))) return `${base}-${i}`;
}

// ---------- Kategori ----------

export type CategoryInput = { id?: string; name: string; isVisible: boolean; sortOrder: number };

export async function listAdminCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function saveCategory(input: CategoryInput) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "Nama kategori wajib diisi" };
  const data = { name, isVisible: input.isVisible, sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0 };
  const category = input.id
    ? await prisma.category.update({ where: { id: input.id }, data })
    : await prisma.category.create({ data: { ...data, slug: await uniqueSlug("category", name) } });
  return { ok: true as const, category };
}

export async function deleteCategory(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const n = await prisma.product.count({ where: { categoryId: id } });
  if (n > 0) return { ok: false, error: "Kategori masih berisi produk" };
  await prisma.category.delete({ where: { id } });
  return { ok: true };
}

// ---------- Produk ----------

const int = (msg: string) => z.coerce.number().int(msg);

const productSchema = z
  .object({
    id: z.string().optional(),
    categoryId: z.string().min(1, "Pilih kategori"),
    name: z.string().trim().min(1, "Nama produk wajib diisi").max(100),
    description: z.string().max(4000).default(""),
    price: int("Harga harus angka bulat").positive("Harga harus lebih dari 0"),
    compareAtPrice: int("Harga coret harus angka bulat").positive().nullable().optional(),
    weightGrams: int("Berat harus angka bulat").positive("Berat harus lebih dari 0"),
    isVisible: z.boolean(),
    isFeatured: z.boolean(),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z.string().trim().min(1, "Label ukuran wajib diisi").max(30),
          sku: z.string().trim().min(1, "SKU wajib diisi").max(60),
          stock: int("Stok harus angka bulat").min(0, "Stok tidak boleh negatif"),
          /** Stok saat form dibuka. Wajib untuk varian lama agar stok yang berubah karena pesanan tidak tertimpa. */
          baseStock: z.coerce.number().int().optional(),
        }),
      )
      .min(1, "Minimal satu varian/ukuran"),
    imageUrls: z.array(z.string().min(1)).max(10, "Maksimal 10 foto"),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice != null && v.compareAtPrice <= v.price)
      ctx.addIssue({ code: "custom", message: "Harga coret harus lebih tinggi dari harga jual" });
    const skus = v.variants.map((x) => x.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) ctx.addIssue({ code: "custom", message: "SKU tidak boleh sama di dalam satu produk" });
  });

export type ProductInput = z.input<typeof productSchema>;
export type SaveProductResult = { ok: true; id: string } | { ok: false; errors: string[] };

class StaleStockError extends Error {}

export async function saveProduct(raw: ProductInput): Promise<SaveProductResult> {
  try {
    return await saveProductInner(raw);
  } catch (e) {
    if (e instanceof StaleStockError) return { ok: false, errors: [e.message] };
    throw e;
  }
}

async function saveProductInner(raw: ProductInput): Promise<SaveProductResult> {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const p = parsed.data;

  // SKU unik lintas produk (varian milik produk ini sendiri boleh).
  const clash = await prisma.variant.findFirst({
    where: { sku: { in: p.variants.map((v) => v.sku), mode: "insensitive" }, ...(p.id ? { productId: { not: p.id } } : {}) },
  });
  if (clash) return { ok: false, errors: [`SKU ${clash.sku} sudah dipakai produk lain`] };

  const data = {
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    weightGrams: p.weightGrams,
    isVisible: p.isVisible,
    isFeatured: p.isFeatured,
  };

  const id = await prisma.$transaction(async (tx) => {
    const product = p.id
      ? await tx.product.update({ where: { id: p.id }, data })
      : await tx.product.create({ data: { ...data, slug: await uniqueSlug("product", p.name) } });

    // Foto: ganti seluruh daftar sesuai urutan form.
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (p.imageUrls.length)
      await tx.productImage.createMany({ data: p.imageUrls.map((url, i) => ({ productId: product.id, url, sortOrder: i })) });

    // Varian: perbarui yang ada, buat yang baru, dan tangani yang dihapus dari form.
    const existing = await tx.variant.findMany({ where: { productId: product.id }, include: { _count: { select: { orderItems: true } } } });
    const keep = new Set(p.variants.flatMap((v) => (v.id ? [v.id] : [])));
    for (const old of existing.filter((e) => !keep.has(e.id))) {
      if (old._count.orderItems > 0)
        await tx.variant.update({ where: { id: old.id }, data: { isArchived: true, stock: 0, sku: `${old.sku}~arsip-${old.id.slice(-6)}` } });
      else await tx.variant.delete({ where: { id: old.id } });
    }
    for (const [i, v] of p.variants.entries()) {
      const fields = { label: v.label, sku: v.sku, sortOrder: i, isArchived: false };
      if (v.id && existing.some((e) => e.id === v.id)) {
        // Stok = stok yang bisa dijual (unit yang ditahan pesanan sudah dikurangi). Hanya ditulis jika
        // nilainya masih sama seperti saat form dibuka; kalau pesanan masuk/kedaluwarsa di antaranya → tolak.
        if (v.baseStock === undefined) {
          await tx.variant.update({ where: { id: v.id }, data: fields });
        } else {
          const r = await tx.variant.updateMany({ where: { id: v.id, stock: v.baseStock }, data: { ...fields, stock: v.stock } });
          if (r.count === 0)
            throw new StaleStockError(`Stok ${v.label} berubah sejak halaman dibuka (ada pesanan masuk/batal). Muat ulang halaman lalu simpan lagi.`);
        }
      } else await tx.variant.create({ data: { ...fields, stock: v.stock, productId: product.id } });
    }
    return product.id;
  });
  return { ok: true, id };
}

/** Produk untuk form edit, dengan `held` = unit yang sedang ditahan pesanan belum lunas/bermasalah per varian. */
export async function getAdminProduct(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;
  const held = await prisma.orderItem.groupBy({
    by: ["variantId"],
    where: { variantId: { in: p.variants.map((v) => v.id) }, order: { stockHeld: true, status: { in: ["MENUNGGU_BAYAR", "MENUNGGU_VERIFIKASI", "PERLU_TINDAKAN"] } } },
    _sum: { qty: true },
  });
  const heldBy = new Map(held.map((h) => [h.variantId, h._sum.qty ?? 0]));
  return { ...p, variants: p.variants.map((v) => ({ ...v, held: heldBy.get(v.id) ?? 0 })) };
}

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  price: number;
  image: string | null;
  totalStock: number;
  sold: number;
  isVisible: boolean;
  isFeatured: boolean;
};

export async function listAdminProducts({ q, categoryId }: { q?: string; categoryId?: string }): Promise<AdminProductRow[]> {
  const term = q?.trim();
  const rows = await prisma.product.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(term
        ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { slug: { contains: term.toLowerCase() } }] }
        : {}),
    },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { where: { isArchived: false } },
    },
    orderBy: { createdAt: "desc" },
  });
  const sold = await prisma.orderItem.findMany({
    where: { variant: { productId: { in: rows.map((r) => r.id) } }, order: { status: { in: [...SOLD_STATUSES] } } },
    select: { qty: true, variant: { select: { productId: true } } },
  });
  const soldBy = new Map<string, number>();
  for (const s of sold) soldBy.set(s.variant.productId, (soldBy.get(s.variant.productId) ?? 0) + s.qty);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    categoryName: r.category.name,
    price: r.price,
    image: r.images[0]?.url ?? null,
    totalStock: r.variants.reduce((n, v) => n + v.stock, 0),
    sold: soldBy.get(r.id) ?? 0,
    isVisible: r.isVisible,
    isFeatured: r.isFeatured,
  }));
}
