import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { verifyAdminCredentials } from "./service";

const EMAIL = "admin-tes@toraho.test";

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("rahasia-123", 4);
  await prisma.adminUser.upsert({ where: { email: EMAIL }, create: { email: EMAIL, name: "Admin Tes", passwordHash }, update: { passwordHash } });
});

describe("verifyAdminCredentials", () => {
  it("kredensial benar → data admin", async () => {
    expect(await verifyAdminCredentials(EMAIL, "rahasia-123")).toMatchObject({ email: EMAIL, name: "Admin Tes" });
  });
  it("email huruf kapital + spasi tetap cocok", async () => {
    expect(await verifyAdminCredentials("  Admin-Tes@Toraho.TEST ", "rahasia-123")).not.toBeNull();
  });
  it("kata sandi salah atau email tidak ada → null", async () => {
    expect(await verifyAdminCredentials(EMAIL, "salah")).toBeNull();
    expect(await verifyAdminCredentials("tidak-ada@toraho.test", "rahasia-123")).toBeNull();
  });
});
