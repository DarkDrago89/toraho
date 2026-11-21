import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Masuk Admin", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="grain flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_50%_20%,#222_0%,#0b0b0b_60%)] px-4">
      <div className="w-full max-w-sm">
        <Logo variant="full" className="mx-auto w-40" priority />
        <h1 className="display mt-6 text-center text-2xl">Panel Admin</h1>
        <LoginForm />
      </div>
    </div>
  );
}
