// Menerapkan migrasi ke database pengujian (TEST_DATABASE_URL). Jalankan: npm run db:test:prepare
import "dotenv/config";
import { execSync } from "node:child_process";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("TEST_DATABASE_URL belum diisi di .env");
  process.exit(1);
}
execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
