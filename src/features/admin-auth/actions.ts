"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function loginAction(
  _prev: { error: string; email?: string } | null,
  form: FormData,
): Promise<{ error: string; email?: string }> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: String(form.get("password") ?? ""),
      redirectTo: "/admin/ringkasan",
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Email atau kata sandi salah", email };
    throw e; // redirect sukses dilempar sebagai error khusus Next.js
  }
  return { error: "" };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/masuk" });
}
