"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = { name?: string | null; role?: string };

/**
 * Tautan akun di header. Sesi dibaca di browser (bukan di layout server) supaya halaman toko
 * tetap bisa di-cache sebagai halaman statis.
 */
export function AccountLink({ loginEnabled }: { loginEnabled: boolean }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: SessionUser } | null) => alive && setUser(s?.user ?? null))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, []);

  const cls = "flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-muted transition hover:text-paper";
  if (user?.role === "customer") {
    const initial = (user.name?.trim()[0] ?? "A").toUpperCase();
    return (
      <Link href="/akun" className={cls} aria-label={`Akun ${user.name ?? ""}`.trim()}>
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border border-paper text-[0.7rem] tracking-normal text-paper">
          {initial}
        </span>
        <span className="hidden sm:inline">Akun</span>
      </Link>
    );
  }
  if (user === null && loginEnabled) {
    return (
      <Link href="/masuk" className={cls}>
        Masuk
      </Link>
    );
  }
  return null;
}
