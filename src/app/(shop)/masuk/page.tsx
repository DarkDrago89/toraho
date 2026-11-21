import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { googleSignInAction } from "@/features/customer-auth/actions";
import { isGoogleLoginEnabled } from "@/features/customer-auth/config";
import { safeNextPath } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

const ERROR_TEXT: Record<string, string> = {
  AccessDenied: "Akun Google ini belum bisa dipakai: emailnya belum terverifikasi, atau sudah terhubung ke akun Google lain.",
  OAuthCallbackError: "Login Google dibatalkan atau gagal. Silakan coba lagi.",
  OAuthSignInError: "Tidak bisa membuka halaman login Google. Silakan coba lagi.",
};

export default async function CustomerLoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const target = safeNextPath(next);
  const session = await auth();
  if (session?.user?.role === "customer") redirect(target);
  const enabled = isGoogleLoginEnabled();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="eyebrow">Akun</p>
      <h1 className="display mt-2 text-4xl">Masuk</h1>
      <p className="mt-3 text-sm text-muted">
        Masuk untuk melihat semua pesananmu di satu tempat. Pesanan lama yang memakai email yang sama ikut tampil.
      </p>

      {error && (
        <p role="alert" className="mt-6 border border-paper p-4 text-sm">
          {ERROR_TEXT[error] ?? "Login gagal, silakan coba lagi."}
        </p>
      )}

      {enabled ? (
        <form action={googleSignInAction} className="mt-8">
          <input type="hidden" name="next" value={target} />
          <button
            type="submit"
            className="w-full bg-paper py-4 text-xs font-bold tracking-[0.25em] text-ink uppercase transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
          >
            Masuk dengan Google
          </button>
        </form>
      ) : (
        <p className="mt-8 border border-line p-4 text-sm text-muted">Login pembeli belum diaktifkan oleh toko.</p>
      )}

      <p className="mt-8 text-sm text-muted">
        Tidak perlu akun untuk belanja.{" "}
        <Link href="/lacak" className="underline underline-offset-4 hover:text-paper">
          Lacak pesanan dengan kode + nomor HP
        </Link>
        .
      </p>
    </div>
  );
}
