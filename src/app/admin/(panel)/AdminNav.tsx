"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/ringkasan", label: "Ringkasan", short: "Ringkas" },
  { href: "/admin/pesanan", label: "Pesanan", short: "Pesanan" },
  { href: "/admin/produk", label: "Produk", short: "Produk" },
  { href: "/admin/kategori", label: "Kategori", short: "Kategori" },
  { href: "/admin/pengaturan", label: "Pengaturan", short: "Atur" },
];

export function AdminNav({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  if (variant === "bottom") {
    return (
      <ul className="grid grid-cols-5">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={active(i.href) ? "page" : undefined}
              className={`block py-3.5 text-center text-[0.65rem] tracking-[0.12em] uppercase ${active(i.href) ? "font-bold text-paper" : "text-muted"}`}
            >
              {i.short}
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="space-y-1">
      {ITEMS.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className={`block px-3 py-2.5 text-xs tracking-[0.2em] uppercase transition ${
              active(i.href) ? "bg-paper font-bold text-ink" : "text-muted hover:bg-ink-3 hover:text-paper"
            }`}
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
