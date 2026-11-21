import { getShippingRates } from "@/features/settings/service";
import { ProvinceRateProvider } from "./province-rate";
import type { ShippingRateProvider } from "./types";

/**
 * Sumber ongkir yang dipakai checkout.
 * Tahap 2 (RajaOngkir/Komerce): cukup kembalikan provider API kurir di sini.
 */
export async function getShippingProvider(): Promise<ShippingRateProvider> {
  return new ProvinceRateProvider(await getShippingRates());
}
