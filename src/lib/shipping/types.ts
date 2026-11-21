import type { ProvinceCode } from "./provinces";

export type ShippingDestination = {
  provinceCode: string;
  city: string;
  district: string;
  postalCode: string;
};

export type ShippingQuote = { cost: number; label: string };

/** Satu hasil pencarian tujuan (kelurahan) dari API kurir, sudah dipetakan ke kode provinsi toko. */
export type DestinationView = {
  id: string;
  label: string;
  provinceCode: ProvinceCode;
  city: string;
  district: string;
  subdistrict: string;
  postalCode: string;
};

/**
 * Sumber tarif ongkir. Tahap 1: tarif tetap per provinsi.
 * Tahap 2: API kurir (RajaOngkir/Komerce) cukup mengimplementasikan antarmuka yang sama,
 * karena tujuan terstruktur dan berat sudah dikumpulkan sejak sekarang.
 */
export interface ShippingRateProvider {
  quote(input: { destination: ShippingDestination; weightGrams: number }): Promise<ShippingQuote | null>;
}
