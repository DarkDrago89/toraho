import { dbCache, type KeyValueCache } from "@/lib/cache";
import { provinceCodeFromName } from "./provinces";
import type { DestinationView } from "./types";

/**
 * Klien RajaOngkir (Komerce) — hanya dipakai di server, API key tidak pernah dikirim ke browser.
 * Dokumentasi: https://rajaongkir.com/docs/shipping-cost
 */
export const RAJAONGKIR_BASE_URL = "https://rajaongkir.komerce.id/api/v1";

const SEARCH_TTL = 7 * 24 * 3600_000; // data wilayah jarang berubah
const EMPTY_SEARCH_TTL = 24 * 3600_000;
const COST_TTL = 30 * 60_000;

/** Gagal menghubungi RajaOngkir (jaringan, timeout, key salah, kuota habis, atau respons rusak). */
export class ShippingApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ShippingApiError";
  }
}

export type RawService = {
  courier: string;
  courierName: string;
  service: string;
  description: string;
  cost: number;
  etd: string | null;
};

type Options = {
  apiKey: string;
  fetchFn?: typeof fetch;
  baseUrl?: string;
  cache?: KeyValueCache;
  timeoutMs?: number;
};

type Envelope<T> = { meta?: { message?: string; code?: number }; data?: T | null };

type RawDestination = {
  id: number | string;
  label?: string;
  province_name?: string;
  city_name?: string;
  district_name?: string;
  subdistrict_name?: string;
  zip_code?: string | number;
};

type RawCost = { name?: string; code?: string; service?: string; description?: string; cost?: number | string; etd?: string };

/** "2-3 day" / "1" / "2 - 3 HARI" → "2–3 hari" / "1 hari"; tanpa angka → null. */
export function normalizeEtd(etd: unknown): string | null {
  const m = String(etd ?? "").match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return null;
  return m[2] && m[2] !== m[1] ? `${m[1]}–${m[2]} hari` : `${m[1]} hari`;
}

export function createRajaOngkirClient(opts: Options) {
  const fetchFn = opts.fetchFn ?? fetch;
  const base = (opts.baseUrl ?? RAJAONGKIR_BASE_URL).replace(/\/$/, "");
  const cache = opts.cache ?? dbCache();
  const timeoutMs = opts.timeoutMs ?? 8000;

  /** Memanggil API dan mengembalikan [status, isi JSON]. Gagal jaringan / JSON rusak → ShippingApiError. */
  async function call<T>(path: string, init: RequestInit): Promise<[number, Envelope<T>]> {
    let res: Response;
    try {
      res = await fetchFn(`${base}${path}`, {
        ...init,
        headers: { key: opts.apiKey, Accept: "application/json", ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (e) {
      throw new ShippingApiError(`RajaOngkir tidak bisa dihubungi: ${e instanceof Error ? e.message : String(e)}`);
    }
    const text = await res.text();
    let json: Envelope<T>;
    try {
      json = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new ShippingApiError(`RajaOngkir ${res.status}: respons bukan JSON`, res.status);
    }
    return [res.status, json];
  }

  const fail = (status: number, json: Envelope<unknown>) =>
    new ShippingApiError(`RajaOngkir ${status}: ${json.meta?.message ?? "respons tidak valid"}`, status);

  return {
    /** Cari kelurahan/kecamatan/kota/kode pos. Hasil dengan provinsi yang tidak dikenali disaring. */
    async searchDestinations(query: string, limit = 10): Promise<DestinationView[]> {
      const q = query.trim();
      const key = `ro:dest:${limit}:${q.toLowerCase()}`;
      const hit = await cache.get<DestinationView[]>(key);
      if (hit) return hit;

      const params = new URLSearchParams({ search: q, limit: String(limit), offset: "0" });
      const [status, json] = await call<RawDestination[]>(`/destination/domestic-destination?${params}`, { method: "GET" });
      let rows: RawDestination[] = [];
      if (status === 404) rows = [];
      else if (status >= 200 && status < 300) rows = Array.isArray(json.data) ? json.data : [];
      else throw fail(status, json);

      const result: DestinationView[] = [];
      for (const d of rows) {
        const provinceCode = provinceCodeFromName(String(d.province_name ?? ""));
        if (!provinceCode) {
          console.warn(`[rajaongkir] provinsi tidak dikenali: "${d.province_name}" (id ${d.id})`);
          continue;
        }
        const parts = [d.subdistrict_name, d.district_name, d.city_name, d.province_name, d.zip_code];
        result.push({
          id: String(d.id),
          label: d.label?.trim() || parts.filter(Boolean).join(", "),
          provinceCode,
          city: String(d.city_name ?? "").trim(),
          district: String(d.district_name ?? "").trim(),
          subdistrict: String(d.subdistrict_name ?? "").trim(),
          postalCode: String(d.zip_code ?? "").trim(),
        });
      }
      await cache.set(key, result, result.length ? SEARCH_TTL : EMPTY_SEARCH_TTL);
      return result;
    },

    /** Tarif semua layanan kurir dari asal ke tujuan (id hasil pencarian). [] = tidak ada layanan. */
    async calculate(input: { origin: string; destination: string; weightGrams: number; couriers: string[] }): Promise<RawService[]> {
      const weight = Math.max(1, Math.round(input.weightGrams));
      const courier = input.couriers.join(":");
      const key = `ro:cost:${input.origin}:${input.destination}:${weight}:${courier}`;
      const hit = await cache.get<RawService[]>(key);
      if (hit) return hit;

      const body = new URLSearchParams({ origin: input.origin, destination: input.destination, weight: String(weight), courier });
      const [status, json] = await call<RawCost[]>("/calculate/domestic-cost", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      let rows: RawCost[];
      if (status >= 200 && status < 300) rows = Array.isArray(json.data) ? json.data : [];
      // "Calculate Domestic Shipping Cost not found": kurir tidak melayani rute ini.
      else if (status === 400 && /not found/i.test(json.meta?.message ?? "")) rows = [];
      else throw fail(status, json);

      const result = rows
        .map((d) => ({
          courier: String(d.code ?? "").toLowerCase(),
          courierName: String(d.name ?? d.code ?? "").trim(),
          service: String(d.service ?? "").trim(),
          description: String(d.description ?? "").trim(),
          cost: Number(d.cost),
          etd: normalizeEtd(d.etd),
        }))
        .filter((s) => s.courier && s.service && Number.isFinite(s.cost) && s.cost > 0);
      await cache.set(key, result, COST_TTL);
      return result;
    },
  };
}

export type RajaOngkirClient = ReturnType<typeof createRajaOngkirClient>;
