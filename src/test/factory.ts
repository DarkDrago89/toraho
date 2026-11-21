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

/**
 * Pesanan lewat jalur checkout asli (stok ikut ditahan). Ongkir JB Rp15.000 disiapkan otomatis.
 * `status`/override lain langsung ditulis ke DB setelah dibuat.
 */
export async function makeOrder(
  o: {
    stock?: number;
    qty?: number;
    price?: number;
    paymentMethod?: "MIDTRANS" | "MANUAL";
    /** Email checkout (lewat createOrder, jadi ikut dinormalkan seperti pesanan asli). */
    email?: string;
    now?: Date;
    set?: import("@prisma/client").Prisma.OrderUpdateInput;
  } = {},
) {
  const { createOrder } = await import("@/features/checkout/service");
  await prisma.shippingRate.upsert({ where: { provinceCode: "JB" }, create: { provinceCode: "JB", cost: 15000 }, update: { cost: 15000 } });
  const { variant, product } = await makeProduct({ stock: o.stock ?? 5, price: o.price ?? 100000 });
  const r = await createOrder(
    {
      lines: [{ variantId: variant.id, qty: o.qty ?? 1 }],
      customerName: "Pembeli Tes",
      phone: "081234567890",
      email: o.email,
      provinceCode: "JB",
      city: "Bandung",
      district: "Coblong",
      postalCode: "40132",
      addressLine: "Jl. Tes 1",
      paymentMethod: o.paymentMethod ?? "MIDTRANS",
      shippingOptionId: "standar",
    },
    o.now ?? new Date(),
  );
  if (!r.ok) throw new Error(r.errors.join(", "));
  const order = o.set
    ? await prisma.order.update({ where: { id: r.order.id }, data: o.set })
    : await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
  return { order, variant, product };
}

export async function orderOf(id: string) {
  return prisma.order.findUniqueOrThrow({ where: { id } });
}

export async function stockOf(variantId: string) {
  return (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;
}
