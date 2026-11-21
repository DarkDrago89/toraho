import "next-auth";
import "next-auth/jwt";
import type { Role } from "@/lib/auth/access";

declare module "next-auth" {
  interface Session {
    /** `role` kosong = token lama sebelum ada peran; diperlakukan sebagai belum masuk. */
    user: { id: string; role?: Role; name?: string | null; email?: string | null; image?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** id AdminUser (peran admin) atau id Customer (peran customer). */
    uid?: string;
    role?: Role;
  }
}
