import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyAdminCredentials } from "@/features/admin-auth/service";
import { assertAdmin, assertCustomer } from "@/lib/auth/access";

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
  callbacks: {
    ...authConfig.callbacks,
    /** Saat login, tentukan peran dari provider. Setelah itu token hanya diteruskan. */
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user?.id) {
        token.role = "admin";
        token.uid = user.id;
      }
      return token;
    },
  },
});

/** Wajib dipanggil di setiap server action admin. Middleware hanya melindungi halaman, bukan action. */
export async function requireAdmin() {
  return assertAdmin(await auth());
}

/** Untuk aksi/halaman khusus pembeli yang sudah login dengan Google. */
export async function requireCustomer() {
  return assertCustomer(await auth());
}
