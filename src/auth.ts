import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyAdminCredentials } from "@/features/admin-auth/service";
import { isGoogleLoginEnabled } from "@/features/customer-auth/config";
import { findCustomerIdByGoogleSub, upsertGoogleCustomer } from "@/features/customer-auth/service";
import { assertAdmin, assertCustomer } from "@/lib/auth/access";

const credentialsSchema = z.object({ email: z.string().min(3), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Admin: email + kata sandi.
    Credentials({
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        return verifyAdminCredentials(parsed.data.email, parsed.data.password);
      },
    }),
    // Pembeli: Google (AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET). Tanpa env ini login pembeli dimatikan.
    ...(isGoogleLoginEnabled() ? [Google] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /** Login Google hanya untuk email yang sudah diverifikasi Google. false → /masuk?error=AccessDenied. */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const r = await upsertGoogleCustomer({
        sub: account.providerAccountId,
        email: profile?.email,
        emailVerified: profile?.email_verified === true,
        name: profile?.name,
        image: typeof profile?.picture === "string" ? profile.picture : null,
      });
      return r.ok;
    },
    /** Saat login, tentukan peran dari provider. Setelah itu token hanya diteruskan. */
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user?.id) {
        token.role = "admin";
        token.uid = user.id;
      } else if (account?.provider === "google") {
        const customerId = await findCustomerIdByGoogleSub(account.providerAccountId);
        if (customerId) {
          token.role = "customer";
          token.uid = customerId;
        }
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
