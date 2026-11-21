import { getShippingRates } from "@/features/settings/service";
import { getRajaOngkirConfig, type RajaOngkirConfig } from "./config";
import { ProvinceRateProvider, STANDARD_OPTION_ID } from "./province-rate";
import { ShippingApiError, type RawService } from "./rajaongkir";
import type { ShippingDestination, ShippingOption } from "./types";

export { STANDARD_OPTION_ID };

export type ShippingMode = "kurir" | "standar";

/** "kurir" jika RajaOngkir siap dipakai (API key + asal pengiriman), selain itu "standar". */
export async function getShippingMode(): Promise<ShippingMode> {
  return (await getRajaOngkirConfig()) ? "kurir" : "standar";
}

const COURIER_LABEL: Record<string, string> = { jne: "JNE", jnt: "J&T", sicepat: "SiCepat", pos: "POS", tiki: "TIKI", anteraja: "AnterAja", ninja: "Ninja" };

function toOption(s: RawService): ShippingOption {
  return {
    id: `${s.courier}:${s.service}`,
    courier: s.courier,
    service: s.service,
    label: `${COURIER_LABEL[s.courier] ?? s.courierName} ${s.service}`,
    description: s.description,
    cost: s.cost,
    etd: s.etd,
  };
}

export type ShippingOptionsResult = {
  options: ShippingOption[];
  /** true = RajaOngkir aktif tetapi gagal/tidak punya layanan, jadi yang tampil tarif standar. */
  fallback: boolean;
};

/**
 * Pilihan pengiriman untuk satu tujuan. Mencoba RajaOngkir dulu; jika gagal atau tidak ada layanan,
 * memakai tarif standar provinsi supaya checkout tidak macet. Dipakai di layar checkout DAN saat
 * pesanan dibuat (hitung ulang), jadi keduanya selalu memakai aturan yang sama.
 */
export async function getShippingOptions(
  input: { destination: ShippingDestination; weightGrams: number },
  deps: { config?: RajaOngkirConfig | null; rates?: Record<string, number> } = {},
): Promise<ShippingOptionsResult> {
  const config = deps.config !== undefined ? deps.config : await getRajaOngkirConfig();
  const standard = async () => new ProvinceRateProvider(deps.rates ?? (await getShippingRates())).quotes(input);
  const destinationId = input.destination.destinationId;

  if (!config) return { options: await standard(), fallback: false };
  if (!destinationId) return { options: await standard(), fallback: true };

  try {
    const raw = await config.client.calculate({
      origin: config.origin.id,
      destination: destinationId,
      weightGrams: input.weightGrams,
      couriers: config.couriers,
    });
    const byId = new Map<string, ShippingOption>();
    for (const o of raw.map(toOption)) {
      const prev = byId.get(o.id);
      if (!prev || o.cost < prev.cost) byId.set(o.id, o);
    }
    const options = [...byId.values()].toSorted((a, b) => a.cost - b.cost);
    if (options.length) return { options, fallback: false };
  } catch (e) {
    if (!(e instanceof ShippingApiError)) throw e;
    console.warn(`[ongkir] RajaOngkir gagal, memakai tarif standar: ${e.message}`);
  }
  return { options: await standard(), fallback: true };
}
