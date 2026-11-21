import { NextResponse, type NextRequest } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { getRajaOngkirClient } from "@/lib/shipping/config";
import { ShippingApiError } from "@/lib/shipping/rajaongkir";

// Rem sederhana terhadap skrip: tiap pencarian baru memakai kuota RajaOngkir.
const allow = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });

/**
 * Cari tujuan pengiriman (kelurahan/kecamatan/kota/kode pos) lewat RajaOngkir.
 * Browser memanggil rute ini, bukan RajaOngkir langsung, jadi API key tetap di server.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3 || q.length > 60) return NextResponse.json({ error: "Ketik minimal 3 huruf" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "lokal";
  if (!allow(ip)) return NextResponse.json({ error: "Terlalu banyak pencarian, coba lagi beberapa menit lagi" }, { status: 429 });

  // Cukup API key: admin memakai rute ini juga untuk memilih asal pengiriman.
  const client = getRajaOngkirClient();
  if (!client) return NextResponse.json({ mode: "standar", results: [] }, { status: 404 });

  try {
    const results = await client.searchDestinations(q, 10);
    return NextResponse.json({ results });
  } catch (e) {
    if (!(e instanceof ShippingApiError)) throw e;
    console.warn(`[ongkir] pencarian tujuan gagal: ${e.message}`);
    return NextResponse.json({ error: "Pencarian alamat sedang bermasalah" }, { status: 503 });
  }
}
