import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Wordmark } from "@/components/brand/Logo";
import { logoutAction } from "@/features/admin-auth/actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin Toraho" }, robots: { index: false } };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin/masuk");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line md:flex md:flex-col">
        <Link href="/admin/ringkasan" className="border-b border-line px-5 py-5">
          <Wordmark />
          <span className="eyebrow mt-1 block">Admin</span>
        </Link>
        <div className="flex-1 px-3 py-4">
          <AdminNav variant="side" />
        </div>
        <div className="border-t border-line px-5 py-4 text-xs">
          <p className="truncate text-muted">{session.user.name}</p>
          <div className="mt-2 flex gap-4">
            <Link href="/" className="underline hover:text-paper">Lihat toko</Link>
            <form action={logoutAction}>
              <button className="underline hover:text-paper">Keluar</button>
            </form>
          </div>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
        <Wordmark />
        <form action={logoutAction}>
          <button className="text-xs tracking-[0.2em] text-muted uppercase">Keluar</button>
        </form>
      </header>

      <main className="min-w-0 px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur md:hidden">
        <AdminNav variant="bottom" />
      </nav>
    </div>
  );
}
