// Seed idempoten: aman dijalankan berulang kali (upsert).
//  - Selalu: akun admin + pengaturan & tarif ongkir default (jika belum ada).
//  - SEED_DEMO_PRODUCTS=true: kategori + 27 produk Koleksi 01 (src/data/koleksi-01.ts).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { JAVA_PROVINCES, PROVINCES } from "../src/lib/shipping/provinces";
import { seedKoleksi01 } from "../src/data/seed-koleksi-01";

const prisma = new PrismaClient();

async function seedAdmin() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("SEED_ADMIN_PASSWORD belum diisi di .env");
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@toraho.test" },
    create: { email: "admin@toraho.test", name: "Admin Toraho", passwordHash },
    update: { passwordHash },
  });
}

async function seedSettings() {
  // Hanya diisi jika belum ada, agar tidak menimpa pengaturan yang sudah diubah admin.
  const exists = await prisma.setting.findUnique({ where: { key: "store" } });
  if (!exists) {
    await prisma.setting.create({
      data: {
        key: "store",
        value: {
          paymentWindowHours: 24,
          whatsapp: "081234567890",
          bankAccounts: [{ bank: "BCA", number: "1234567890", holder: "Toraho Store" }],
        },
      },
    });
  }
  if ((await prisma.shippingRate.count()) === 0) {
    const near = new Set(["BA", "LA", "SS", "SU", "SB", "RI", "JA", "BE", "BB", "KR", "AC"]);
    await prisma.shippingRate.createMany({
      data: PROVINCES.map((p) => ({
        provinceCode: p.code,
        cost: JAVA_PROVINCES.includes(p.code) ? 15000 : near.has(p.code) ? 25000 : 35000,
      })),
    });
  }
}

async function main() {
  await seedAdmin();
  await seedSettings();
  if (process.env.SEED_DEMO_PRODUCTS === "true") {
    const r = await seedKoleksi01(prisma);
    console.log(`Koleksi 01: ${r.created} dibuat, ${r.existing} sudah ada.`);
  }
  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
