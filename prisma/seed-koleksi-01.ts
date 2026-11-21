// Memasukkan produk Koleksi 01 ke database yang sudah berjalan (lokal atau produksi).
// Aman dijalankan berulang: produk yang sudah ada tidak diubah. Pakai: npm run db:seed:koleksi01
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedKoleksi01 } from "../src/data/seed-koleksi-01";

const prisma = new PrismaClient();

seedKoleksi01(prisma)
  .then((r) => console.log(`Koleksi 01: ${r.created} produk dibuat, ${r.existing} sudah ada (tidak diubah), ${r.hidden} placeholder lama disembunyikan.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
