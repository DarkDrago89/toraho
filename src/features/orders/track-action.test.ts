import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { makeOrder, uid } from "@/test/factory";

// Sesi login & redirect Next.js ditiru: trackAction adalah server action (POST dari form Lacak).
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { trackAction } = await import("./actions");

const form = (code: string, phone: string) => {
  const f = new FormData();
  f.set("code", code);
  f.set("phone", phone);
  return f;
};

async function run(code: string, phone: string): Promise<string> {
  try {
    await trackAction(null, form(code, phone));
  } catch (e) {
    return (e as { url?: string }).url ?? "";
  }
  return "";
}

async function customer() {
  const tag = uid("trk");
  return prisma.customer.create({ data: { googleSub: tag, email: `${tag}@gmail.com`, name: "T" } });
}

beforeEach(() => {
  session.current = null;
});

describe("trackAction (form Lacak)", () => {
  it("pembeli login + email pesanan sama + nomor HP cocok → pesanan dihubungkan ke akun", async () => {
    const c = await customer();
    const { order } = await makeOrder({ email: c.email });
    session.current = { user: { id: c.id, role: "customer" } };
    const url = await run(order.code, "081234567890");
    expect(url).toContain(`/pesanan/${order.code}`);
    expect(url).toContain("tersimpan=1");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).customerId).toBe(c.id);
  });

  it("tanpa login → hanya membuka pesanan, tidak menghubungkan", async () => {
    const c = await customer();
    const { order } = await makeOrder({ email: c.email });
    const url = await run(order.code, "081234567890");
    expect(url).toContain(`/pesanan/${order.code}`);
    expect(url).not.toContain("tersimpan");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).customerId).toBeNull();
  });

  it("email pesanan berbeda → tidak dihubungkan walau nomor HP cocok", async () => {
    const c = await customer();
    const { order } = await makeOrder({ email: "orang-lain@contoh.id" });
    session.current = { user: { id: c.id, role: "customer" } };
    await run(order.code, "081234567890");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).customerId).toBeNull();
  });
});
