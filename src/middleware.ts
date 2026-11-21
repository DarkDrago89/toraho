import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

// Hanya area admin yang dilindungi; toko publik tidak melewati middleware.
export const config = { matcher: ["/admin/:path*", "/admin"] };
