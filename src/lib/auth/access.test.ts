import { describe, expect, it } from "vitest";
import { assertAdmin, assertCustomer, authorizeRequest, safeNextPath } from "./access";

describe("authorizeRequest", () => {
  it("halaman toko publik selalu boleh", () => {
    expect(authorizeRequest("/", undefined)).toEqual({ allow: true });
    expect(authorizeRequest("/katalog", "customer")).toEqual({ allow: true });
  });

  it("area admin hanya untuk peran admin; selain itu diarahkan ke halaman masuk admin", () => {
    // Redirect eksplisit: halaman masuk default NextAuth adalah /masuk (pembeli), bukan /admin/masuk.
    expect(authorizeRequest("/admin/produk", undefined)).toEqual({ redirect: "/admin/masuk" });
    expect(authorizeRequest("/admin/produk", "customer")).toEqual({ redirect: "/admin/masuk" });
    expect(authorizeRequest("/admin", "customer")).toEqual({ redirect: "/admin/masuk" });
    expect(authorizeRequest("/admin/produk", "admin")).toEqual({ allow: true });
  });

  it("halaman masuk admin: admin diarahkan ke panel, selain itu boleh dibuka", () => {
    expect(authorizeRequest("/admin/masuk", "admin")).toEqual({ redirect: "/admin" });
    expect(authorizeRequest("/admin/masuk", undefined)).toEqual({ allow: true });
    expect(authorizeRequest("/admin/masuk", "customer")).toEqual({ allow: true });
  });

  it("halaman akun hanya untuk pembeli; selain itu diarahkan ke /masuk dengan next", () => {
    expect(authorizeRequest("/akun", "customer")).toEqual({ allow: true });
    expect(authorizeRequest("/akun", undefined)).toEqual({ redirect: "/masuk?next=%2Fakun" });
    expect(authorizeRequest("/akun", "admin")).toEqual({ redirect: "/masuk?next=%2Fakun" });
  });

  it("awalan yang mirip tidak dianggap area terlindungi", () => {
    expect(authorizeRequest("/administrasi", undefined)).toEqual({ allow: true });
    expect(authorizeRequest("/akuntansi", undefined)).toEqual({ allow: true });
  });
});

describe("safeNextPath", () => {
  it("menerima path internal", () => {
    expect(safeNextPath("/akun")).toBe("/akun");
    expect(safeNextPath("/pesanan/TRH-1?x=1")).toBe("/pesanan/TRH-1?x=1");
  });

  it("menolak alamat luar atau nilai aneh dan memakai fallback", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "", "akun", 42, null, undefined]) {
      expect(safeNextPath(bad)).toBe("/akun");
    }
    expect(safeNextPath("//evil.com", "/checkout")).toBe("/checkout");
  });

  it("menolak trik tab/baris baru yang dibuang browser (/\\t/evil → //evil)", () => {
    for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\t\\evil.example", "/\r\n/evil.example", "/ \t/evil.example"]) {
      const out = safeNextPath(bad);
      // Hasil harus tetap path di situs ini: bukan alamat luar setelah browser membersihkan URL.
      expect(new URL(out, "https://toraho.id").origin).toBe("https://toraho.id");
    }
    expect(safeNextPath("/\t/evil.example")).toBe("/akun");
  });

  it("mengembalikan path yang sudah dinormalkan (tanpa karakter kontrol)", () => {
    expect(safeNextPath("/pesanan/TRH-1?hp=0812#atas")).toBe("/pesanan/TRH-1?hp=0812#atas");
  });
});

describe("assertAdmin / assertCustomer", () => {
  const admin = { user: { id: "a1", role: "admin" as const, name: "Admin" } };
  const customer = { user: { id: "c1", role: "customer" as const, email: "p@x.id" } };

  it("assertAdmin hanya meloloskan sesi admin", () => {
    expect(assertAdmin(admin)).toMatchObject({ id: "a1" });
    expect(() => assertAdmin(null)).toThrow();
    expect(() => assertAdmin(customer)).toThrow();
    // Token lama (dibuat sebelum ada peran) tidak boleh dianggap admin.
    expect(() => assertAdmin({ user: { id: "a1" } })).toThrow();
    expect(() => assertAdmin({ user: { role: "admin" } })).toThrow();
  });

  it("assertCustomer hanya meloloskan sesi pembeli", () => {
    expect(assertCustomer(customer)).toMatchObject({ id: "c1" });
    expect(() => assertCustomer(admin)).toThrow();
    expect(() => assertCustomer(undefined)).toThrow();
  });
});
