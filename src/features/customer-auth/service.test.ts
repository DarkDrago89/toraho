import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { uid } from "@/test/factory";
import { findCustomerIdByGoogleSub, upsertGoogleCustomer } from "./service";

const profile = (over: Partial<Parameters<typeof upsertGoogleCustomer>[0]> = {}) => {
  const sub = over.sub ?? uid("sub");
  return { sub, email: `${sub}@Gmail.com`, emailVerified: true, name: "Pembeli", image: "https://lh3.googleusercontent.com/a/x", ...over };
};

describe("upsertGoogleCustomer", () => {
  it("membuat pembeli baru dengan email huruf kecil", async () => {
    const p = profile();
    const r = await upsertGoogleCustomer(p);
    expect(r.ok).toBe(true);
    const c = await prisma.customer.findUniqueOrThrow({ where: { googleSub: p.sub } });
    expect(c.email).toBe(p.email!.toLowerCase());
    expect(r).toEqual({ ok: true, customerId: c.id });
  });

  it("login ulang memperbarui nama, email, dan foto tanpa membuat duplikat", async () => {
    const p = profile();
    const first = await upsertGoogleCustomer(p);
    const again = await upsertGoogleCustomer({ ...p, name: "Nama Baru", image: null, email: `baru-${p.sub}@gmail.com` });
    expect(again).toEqual(first);
    const c = await prisma.customer.findUniqueOrThrow({ where: { googleSub: p.sub } });
    expect(c).toMatchObject({ name: "Nama Baru", image: null, email: `baru-${p.sub}@gmail.com`.toLowerCase() });
    expect(await prisma.customer.count({ where: { googleSub: p.sub } })).toBe(1);
  });

  it("menolak email yang belum diverifikasi Google atau kosong", async () => {
    expect(await upsertGoogleCustomer(profile({ emailVerified: false }))).toEqual({ ok: false, reason: "unverified" });
    expect(await upsertGoogleCustomer(profile({ emailVerified: undefined }))).toEqual({ ok: false, reason: "unverified" });
    expect(await upsertGoogleCustomer(profile({ email: null }))).toEqual({ ok: false, reason: "unverified" });
  });

  it("menolak email yang sudah dipakai akun Google lain", async () => {
    const a = profile();
    await upsertGoogleCustomer(a);
    const r = await upsertGoogleCustomer(profile({ email: a.email!.toUpperCase() }));
    expect(r).toEqual({ ok: false, reason: "email-taken" });
  });

  it("nama kosong diganti bagian depan email", async () => {
    const p = profile({ name: "  " });
    await upsertGoogleCustomer(p);
    const c = await prisma.customer.findUniqueOrThrow({ where: { googleSub: p.sub } });
    expect(c.name).toBe(p.sub);
  });
});

describe("findCustomerIdByGoogleSub", () => {
  it("mengembalikan id pembeli, atau null jika tidak ada", async () => {
    const p = profile();
    const r = await upsertGoogleCustomer(p);
    expect(await findCustomerIdByGoogleSub(p.sub)).toBe(r.ok ? r.customerId : "x");
    expect(await findCustomerIdByGoogleSub("tidak-ada")).toBeNull();
  });
});
