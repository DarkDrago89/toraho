import { prisma } from "@/lib/db";
import { SOLD_STATUSES } from "@/lib/domain/order-status";

export type SalesReport = {
  revenue: number;
  orders: number;
  units: number;
  avgOrder: number;
  byProduct: { productName: string; units: number; revenue: number }[];
  byCategory: { categoryName: string; units: number; revenue: number }[];
  byVariant: { productName: string; variantLabel: string; units: number }[];
  daily: { date: string; revenue: number }[];
};

const wibDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
/** "YYYY-MM-DD" menurut WIB. */
export const toWibDate = (d: Date) => wibDay.format(d);

/**
 * Laporan penjualan berdasarkan tanggal lunas (paidAt) di [from, to).
 * Hanya status lunas yang dihitung; omzet = subtotal barang (ongkir tidak termasuk).
 * Pengelompokan kategori memakai kategori produk saat ini.
 */
export async function getSalesReport({ from, to }: { from: Date; to: Date }): Promise<SalesReport> {
  const orders = await prisma.order.findMany({
    where: { status: { in: [...SOLD_STATUSES] }, paidAt: { gte: from, lt: to } },
    select: {
      subtotal: true,
      paidAt: true,
      items: {
        select: {
          productName: true,
          variantLabel: true,
          qty: true,
          price: true,
          variant: { select: { product: { select: { id: true, category: { select: { name: true } } } } } },
        },
      },
    },
  });

  const byProduct = new Map<string, { productName: string; units: number; revenue: number }>();
  const byCategory = new Map<string, { categoryName: string; units: number; revenue: number }>();
  const byVariant = new Map<string, { productName: string; variantLabel: string; units: number }>();
  const daily = new Map<string, number>();
  let revenue = 0;
  let units = 0;

  for (const o of orders) {
    revenue += o.subtotal;
    const d = toWibDate(o.paidAt!);
    daily.set(d, (daily.get(d) ?? 0) + o.subtotal);
    for (const it of o.items) {
      const line = it.price * it.qty;
      units += it.qty;
      const pid = it.variant.product.id;
      const p = byProduct.get(pid) ?? { productName: it.productName, units: 0, revenue: 0 };
      p.units += it.qty;
      p.revenue += line;
      byProduct.set(pid, p);
      const cn = it.variant.product.category.name;
      const c = byCategory.get(cn) ?? { categoryName: cn, units: 0, revenue: 0 };
      c.units += it.qty;
      c.revenue += line;
      byCategory.set(cn, c);
      const vk = `${pid}|${it.variantLabel}`;
      const v = byVariant.get(vk) ?? { productName: it.productName, variantLabel: it.variantLabel, units: 0 };
      v.units += it.qty;
      byVariant.set(vk, v);
    }
  }

  // Deret harian lengkap (hari kosong = 0) agar grafik tidak bolong.
  const days: { date: string; revenue: number }[] = [];
  const last = toWibDate(new Date(to.getTime() - 1));
  for (let t = from.getTime(), guard = 0; guard < 400; t += 86400_000, guard++) {
    const key = toWibDate(new Date(t));
    if (days.at(-1)?.date !== key) days.push({ date: key, revenue: daily.get(key) ?? 0 });
    if (key >= last) break;
  }

  const desc = <T extends { units: number }>(a: T, b: T) => b.units - a.units;
  return {
    revenue,
    orders: orders.length,
    units,
    avgOrder: orders.length ? Math.round(revenue / orders.length) : 0,
    byProduct: [...byProduct.values()].sort(desc),
    byCategory: [...byCategory.values()].sort(desc),
    byVariant: [...byVariant.values()].sort(desc),
    daily: days,
  };
}

export async function getLowStock(threshold = 3, limit = 30) {
  const rows = await prisma.variant.findMany({
    where: { isArchived: false, stock: { lte: threshold }, product: { isVisible: true } },
    include: { product: { select: { id: true, name: true } } },
    orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
    take: limit,
  });
  return rows.map((v) => ({ variantId: v.id, productId: v.product.id, productName: v.product.name, label: v.label, stock: v.stock }));
}

/** Preset periode laporan → [from, to) dalam WIB. */
export function resolvePeriod(preset: string | undefined, now = new Date(), custom?: { dari?: string; sampai?: string }) {
  const startOfWibDay = (d: Date) => new Date(`${toWibDate(d)}T00:00:00+07:00`);
  const today = startOfWibDay(now);
  const tomorrow = new Date(today.getTime() + 86400_000);
  if (preset === "7") return { from: new Date(tomorrow.getTime() - 7 * 86400_000), to: tomorrow, label: "7 hari terakhir" };
  if (preset === "bulan") {
    const [y, m] = toWibDate(now).split("-");
    return { from: new Date(`${y}-${m}-01T00:00:00+07:00`), to: tomorrow, label: "Bulan ini" };
  }
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (preset === "rentang" && custom && isDate(custom.dari) && isDate(custom.sampai)) {
    const from = new Date(`${custom.dari}T00:00:00+07:00`);
    const to = new Date(new Date(`${custom.sampai}T00:00:00+07:00`).getTime() + 86400_000);
    if (!isNaN(+from) && !isNaN(+to) && to > from) return { from, to, label: `${custom.dari} s/d ${custom.sampai}` };
  }
  return { from: new Date(tomorrow.getTime() - 30 * 86400_000), to: tomorrow, label: "30 hari terakhir" };
}
