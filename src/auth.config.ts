import type { NextAuthConfig } from "next-auth";
import { authorizeRequest } from "@/lib/auth/access";

/**
 * Konfigurasi ringan (tanpa database) agar bisa dipakai middleware di Edge runtime.
 * Peran (admin/customer) diisi saat login di `src/auth.ts`; di sini hanya dibaca.
 */
export const authConfig = {
  // Halaman masuk/error NextAuth = halaman pembeli: semua kegagalan login Google (AccessDenied, dibatalkan di
  // layar Google, dll.) kembali ke /masuk. Area admin mengarahkan sendiri ke /admin/masuk (authorizeRequest).
  pages: { signIn: "/masuk", error: "/masuk" },
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const decision = authorizeRequest(request.nextUrl.pathname, auth?.user?.role);
      if ("redirect" in decision) return Response.redirect(new URL(decision.redirect, request.nextUrl));
      return decision.allow;
    },
    // Di Edge token hanya diteruskan; pengisian peran butuh database dan ada di src/auth.ts.
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid ?? "";
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
