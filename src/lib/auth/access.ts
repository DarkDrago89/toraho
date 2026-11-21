/**
 * Aturan akses berdasarkan peran sesi. Fungsi murni (tanpa database) agar bisa dipakai
 * middleware di Edge runtime sekaligus di server, dan mudah dites.
 */
export type Role = "admin" | "customer";

export type AccessDecision = { allow: true } | { allow: false } | { redirect: string };

type MaybeSession = { user?: { id?: string | null; role?: unknown; name?: string | null; email?: string | null } | null } | null | undefined;

const inArea = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

export function authorizeRequest(pathname: string, role: Role | undefined): AccessDecision {
  if (inArea(pathname, "/admin")) {
    if (inArea(pathname, "/admin/masuk")) return role === "admin" ? { redirect: "/admin" } : { allow: true };
    // allow:false → NextAuth mengarahkan ke pages.signIn (/admin/masuk).
    return role === "admin" ? { allow: true } : { allow: false };
  }
  if (inArea(pathname, "/akun")) {
    return role === "customer" ? { allow: true } : { redirect: `/masuk?next=${encodeURIComponent(pathname)}` };
  }
  return { allow: true };
}

/** Tujuan setelah login: hanya path internal, supaya tautan login tidak bisa dipakai untuk open redirect. */
export function safeNextPath(next: unknown, fallback = "/akun"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Pertahanan kedua di server: middleware hanya melindungi halaman, bukan server action. */
export function assertAdmin(session: MaybeSession): { id: string; name?: string | null } {
  const u = session?.user;
  if (!u?.id || u.role !== "admin") throw new Error("Sesi admin berakhir, silakan masuk lagi");
  return { id: u.id, name: u.name };
}

export function assertCustomer(session: MaybeSession): { id: string; email?: string | null } {
  const u = session?.user;
  if (!u?.id || u.role !== "customer") throw new Error("Silakan masuk dengan Google dulu");
  return { id: u.id, email: u.email };
}
