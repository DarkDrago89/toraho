import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function verifyAdminCredentials(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // Tetap hitung hash agar waktu respon tidak membocorkan email mana yang terdaftar.
    await bcrypt.compare(password, "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Pt0R6Vn6Gq7b5oS6eM2kWk3HfC4W");
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? { id: user.id, name: user.name, email: user.email } : null;
}
