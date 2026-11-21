import { getShippingOrigin, type ShippingOrigin } from "@/features/settings/service";
import { createRajaOngkirClient, type RajaOngkirClient } from "./rajaongkir";

export type RajaOngkirConfig = { client: RajaOngkirClient; origin: ShippingOrigin; couriers: string[] };

const DEFAULT_COURIERS = "jne:jnt:sicepat";

/** Kode kurir dari env RAJAONGKIR_COURIERS ("jne:jnt:sicepat" atau dipisah koma/spasi). */
export function couriersFromEnv(raw: string | undefined = process.env.RAJAONGKIR_COURIERS): string[] {
  const list = (raw?.trim() || DEFAULT_COURIERS)
    .toLowerCase()
    .split(/[\s,:]+/)
    .filter((c) => /^[a-z0-9]+$/.test(c));
  return list.length ? [...new Set(list)] : DEFAULT_COURIERS.split(":");
}

/**
 * Ongkir kurir aktif hanya jika API key diisi DAN asal pengiriman sudah diatur di admin.
 * null = mode tarif standar per provinsi.
 */
export async function getRajaOngkirConfig(): Promise<RajaOngkirConfig | null> {
  const apiKey = process.env.RAJAONGKIR_API_KEY?.trim();
  if (!apiKey) return null;
  const origin = await getShippingOrigin();
  if (!origin) return null;
  return { client: createRajaOngkirClient({ apiKey }), origin, couriers: couriersFromEnv() };
}
