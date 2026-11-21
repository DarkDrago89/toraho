"use server";

import { signIn, signOut } from "@/auth";
import { safeNextPath } from "@/lib/auth/access";

/** Tombol "Masuk dengan Google". `next` dibatasi ke path internal. */
export async function googleSignInAction(form: FormData) {
  await signIn("google", { redirectTo: safeNextPath(form.get("next")) });
}

export async function customerSignOutAction() {
  await signOut({ redirectTo: "/" });
}
