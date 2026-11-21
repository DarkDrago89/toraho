// Cek respons RajaOngkir ASLI dengan API key di .env (key tidak pernah dicetak).
// Pakai: npm run check:rajaongkir -- [kata kunci]   (default: "cibubur")
// Menampilkan hasil pencarian yang sudah dipetakan, lalu — jika asal pengiriman sudah diatur di admin —
// contoh tarif kurir untuk 1 kg ke hasil pertama. Tidak memakai cache database (tidak mengubah data).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { memoryCache } from "../src/lib/cache";
import { couriersFromEnv } from "../src/lib/shipping/config";
import { createRajaOngkirClient, ShippingApiError } from "../src/lib/shipping/rajaongkir";

async function main() {
  const apiKey = process.env.RAJAONGKIR_API_KEY?.trim();
  if (!apiKey) {
    console.error("RAJAONGKIR_API_KEY belum diisi di .env. Lihat docs/rajaongkir.md.");
    process.exit(1);
  }
  const query = process.argv.slice(2).join(" ").trim() || "cibubur";
  const client = createRajaOngkirClient({ apiKey, cache: memoryCache() });

  console.log(`Mencari "${query}"…`);
  const results = await client.searchDestinations(query, 10);
  console.log(`${results.length} hasil:`);
  for (const d of results.slice(0, 5)) console.log(`  [${d.id}] ${d.label}  → provinsi ${d.provinceCode}, kode pos ${d.postalCode || "?"}`);
  if (!results.length) return;

  const prisma = new PrismaClient();
  try {
    const row = await prisma.setting.findUnique({ where: { key: "shippingOrigin" } });
    const origin = row?.value as { id?: string; label?: string } | null;
    if (!origin?.id) {
      console.log("\nAsal pengiriman belum diatur di admin (Pengaturan → Ongkir Kurir), jadi tarif tidak dicek.");
      return;
    }
    const couriers = couriersFromEnv();
    console.log(`\nTarif 1 kg dari ${origin.label} ke ${results[0].label} (kurir: ${couriers.join(", ")}):`);
    const services = await client.calculate({ origin: origin.id, destination: results[0].id, weightGrams: 1000, couriers });
    if (!services.length) console.log("  (tidak ada layanan)");
    for (const s of services) console.log(`  ${s.courier.toUpperCase()} ${s.service}: Rp ${s.cost.toLocaleString("id-ID")}  ${s.etd ?? ""}  ${s.description}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  if (e instanceof ShippingApiError) console.error(`Gagal: ${e.message}`);
  else console.error(e);
  process.exit(1);
});
