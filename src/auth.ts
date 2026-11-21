import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyAdminCredentials } from "@/features/admin-auth/service";

const credentialsSchema = z.object({ email: z.string().min(3), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        return verifyAdminCredentials(parsed.data.email, parsed.data.password);
      },
    }),
  ],
});

/** Wajib dipanggil di setiap server action admin. Middleware hanya melindungi halaman, bukan action. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sesi admin berakhir, silakan masuk lagi");
  return session.user;
}
