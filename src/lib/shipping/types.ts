export type ShippingDestination = {
  provinceCode: string;
  city: string;
  district: string;
  postalCode: string;
};

export type ShippingQuote = { cost: number; label: string };

/**
 * Sumber tarif ongkir. Tahap 1: tarif tetap per provinsi.
 * Tahap 2: API kurir (RajaOngkir/Komerce) cukup mengimplementasikan antarmuka yang sama,
 * karena tujuan terstruktur dan berat sudah dikumpulkan sejak sekarang.
 */
export interface ShippingRateProvider {
  quote(input: { destination: ShippingDestination; weightGrams: number }): Promise<ShippingQuote | null>;
}
