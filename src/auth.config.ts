import type { NextAuthConfig } from "next-auth";

/** Konfigurasi ringan (tanpa database) agar bisa dipakai middleware di Edge runtime. */
export const authConfig = {
  pages: { signIn: "/admin/masuk" },
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (!pathname.startsWith("/admin")) return true; // toko publik
      if (pathname.startsWith("/admin/masuk")) {
        if (auth?.user) return Response.redirect(new URL("/admin", request.nextUrl));
        return true;
      }
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) token.adminId = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.adminId as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
