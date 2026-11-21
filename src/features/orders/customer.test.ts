import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeOrder, makeProduct, uid } from "@/test/factory";
import { createOrder } from "@/features/checkout/service";
import { getCheckoutDefaults } from "@/features/checkout/defaults";
import { linkGuestOrder, getOrderForCustomer, listCustomerOrders } from "./service";

const PHONE = "081234567890"; // nomor yang dipakai makeOrder

async function makeCustomer() {
  const tag = uid("cust");
  return prisma.customer.create({ data: { googleSub: tag, email: `${tag}@gmail.com`, name: `Pembeli ${tag}` } });
}

let a: Awaited<ReturnType<typeof makeCustomer>>;
let b: Awaited<ReturnType<typeof makeCustomer>>;
const codes: Record<string, string> = {};

beforeAll(async () => {
  a = await makeCustomer();
  b = await makeCustomer();
  // Pesanan tamu dengan email A (diketik dengan huruf besar) → tampil di daftar A, tapi belum terhubung.
  codes.guestSameEmail = (await makeOrder({ email: a.email.toUpperCase() })).order.code;
  // Pesanan saat A login → milik A walau emailnya lain.
  codes.ownById = (await makeOrder({ set: { email: "lain@contoh.id", customer: { connect: { id: a.id } } } })).order.code;
  // Pesanan tamu email lain → bukan milik A.
  codes.guestOther = (await makeOrder({ set: { email: "orang-lain@contoh.id" } })).order.code;
  // Pesanan milik B yang kebetulan memakai email A → tetap milik B.
  codes.ownedByB = (await makeOrder({ set: { email: a.email, customer: { connect: { id: b.id } } } })).order.code;
});

describe("listCustomerOrders", () => {
  it("berisi pesanan akun + pesanan tamu dengan email sama (ditandai belum terhubung), terbaru dulu", async () => {
    const list = await listCustomerOrders(a.id);
    expect(list.map((o) => [o.code, o.linked])).toEqual([
      [codes.ownById, true],
      [codes.guestSameEmail, false],
    ]);
    expect(list[0]).toMatchObject({ itemCount: 1, status: "MENUNGGU_BAYAR" });
    expect(list[0].total).toBeGreaterThan(0);
  });

  it("tidak berisi pesanan tamu lain atau pesanan akun lain dengan email sama", async () => {
    const list = (await listCustomerOrders(a.id)).map((o) => o.code);
    expect(list).not.toContain(codes.guestOther);
    expect(list).not.toContain(codes.ownedByB);
    expect((await listCustomerOrders(b.id)).map((o) => o.code)).toEqual([codes.ownedByB]);
  });

  it("pembeli tidak dikenal → daftar kosong", async () => {
    expect(await listCustomerOrders("tidak-ada")).toEqual([]);
  });
});

describe("pencocokan email persis", () => {
  it("email checkout disimpan dalam huruf kecil", async () => {
    const { order } = await makeOrder({ email: "  Budi.Santoso@Example.COM " });
    expect(order.email).toBe("budi.santoso@example.com");
  });

  it("_ dan % di email tidak dianggap wildcard (pesanan email lain tidak ikut tampil)", async () => {
    const tag = uid("wild");
    const underscore = await prisma.customer.create({ data: { googleSub: `${tag}-u`, email: `${tag}_x@gmail.com`, name: "U" } });
    const percent = await prisma.customer.create({ data: { googleSub: `${tag}-p`, email: `${tag}%@gmail.com`, name: "P" } });
    // Email yang hanya cocok jika _ / % dibaca sebagai wildcard.
    const other = (await makeOrder({ email: `${tag}ax@gmail.com` })).order.code;
    const other2 = (await makeOrder({ email: `${tag}zzz@gmail.com` })).order.code;
    expect((await listCustomerOrders(underscore.id)).map((o) => o.code)).not.toContain(other);
    expect((await listCustomerOrders(percent.id)).map((o) => o.code)).not.toContain(other2);
    expect(await linkGuestOrder(other, PHONE, underscore.id)).toBe(false);
    expect(await linkGuestOrder(other2, PHONE, percent.id)).toBe(false);
  });
});

describe("getOrderForCustomer", () => {
  it("membuka pesanan milik akun tanpa nomor HP", async () => {
    expect((await getOrderForCustomer(codes.ownById.toLowerCase(), a.id))?.code).toBe(codes.ownById);
  });

  it("pesanan tamu yang hanya cocok email belum bisa dibuka tanpa nomor HP", async () => {
    expect(await getOrderForCustomer(codes.guestSameEmail, a.id)).toBeNull();
  });

  it("menolak pesanan orang lain", async () => {
    expect(await getOrderForCustomer(codes.guestOther, a.id)).toBeNull();
    expect(await getOrderForCustomer(codes.ownedByB, a.id)).toBeNull();
    expect(await getOrderForCustomer(codes.ownById, "tidak-ada")).toBeNull();
  });
});

describe("linkGuestOrder", () => {
  it("tidak menghubungkan jika nomor HP salah atau email berbeda", async () => {
    expect(await linkGuestOrder(codes.guestSameEmail, "089999999999", a.id)).toBe(false);
    expect(await linkGuestOrder(codes.guestOther, PHONE, a.id)).toBe(false);
    expect(await linkGuestOrder(codes.ownedByB, PHONE, a.id)).toBe(false);
  });

  it("menghubungkan pesanan tamu milik sendiri setelah nomor HP cocok", async () => {
    expect(await linkGuestOrder(codes.guestSameEmail, PHONE, a.id)).toBe(true);
    expect((await getOrderForCustomer(codes.guestSameEmail, a.id))?.code).toBe(codes.guestSameEmail);
    expect((await listCustomerOrders(a.id)).every((o) => o.linked)).toBe(true);
    // Sudah terhubung → tidak diproses ulang.
    expect(await linkGuestOrder(codes.guestSameEmail, PHONE, a.id)).toBe(false);
  });
});

describe("createOrder + getCheckoutDefaults", () => {
  it("pesanan saat login menyimpan customerId, dan isian checkout berikutnya terisi dari pesanan terakhir", async () => {
    const c = await makeCustomer();
    expect(await getCheckoutDefaults(c.id)).toMatchObject({ customerName: c.name, email: c.email, phone: "", addressLine: "" });

    await prisma.shippingRate.upsert({ where: { provinceCode: "JB" }, create: { provinceCode: "JB", cost: 15000 }, update: { cost: 15000 } });
    const { variant } = await makeProduct();
    const r = await createOrder(
      {
        lines: [{ variantId: variant.id, qty: 1 }],
        customerName: "Nama Di Form",
        phone: "081211112222",
        email: c.email,
        provinceCode: "JB",
        city: "Bandung",
        district: "Coblong",
        postalCode: "40132",
        addressLine: "Jl. Dago 1",
        paymentMethod: "MANUAL",
        shippingOptionId: "standar",
      },
      new Date(),
      c.id,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } })).customerId).toBe(c.id);

    expect(await getCheckoutDefaults(c.id)).toMatchObject({
      customerName: "Nama Di Form",
      email: c.email,
      phone: "081211112222",
      addressLine: "Jl. Dago 1",
    });
  });

  it("pembeli tidak dikenal → null", async () => {
    expect(await getCheckoutDefaults("tidak-ada")).toBeNull();
  });
});
