import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { CartBadge } from "@/features/cart/CartBadge";
import { CartProvider } from "@/features/cart/CartProvider";

const NAV = [
  { href: "/katalog?kategori=jaket", label: "Jaket" },
  { href: "/katalog?kategori=kaos", label: "Kaos" },
  { href: "/katalog?kategori=merch", label: "Merch" },
];

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Toraho, ke beranda">
            <Wordmark />
          </Link>
          <nav aria-label="Kategori" className="hidden gap-8 text-xs tracking-[0.25em] uppercase sm:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-muted transition hover:text-paper">
                {n.label}
              </Link>
            ))}
          </nav>
          <CartBadge />
        </div>
        <nav aria-label="Kategori" className="flex justify-center gap-6 border-t border-line py-2 text-[0.7rem] tracking-[0.25em] uppercase sm:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-muted">虎 harimau · 火 api. Jaket, kaos, dan merch bernuansa Jepang.</p>
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Belanja</p>
            <ul className="space-y-2 text-muted">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="hover:text-paper">
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/lacak" className="hover:text-paper">
                  Lacak Pesanan
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Kontak</p>
            <p className="text-muted">WhatsApp toko diatur di admin.</p>
          </div>
        </div>
        <p className="border-t border-line py-4 text-center text-[0.7rem] tracking-[0.25em] text-muted uppercase">
          © {new Date().getFullYear()} Toraho 虎火
        </p>
      </footer>
    </div>
    </CartProvider>
  );
}
