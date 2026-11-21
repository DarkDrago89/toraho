import type { ProvinceCode } from "./provinces";

export type ShippingDestination = {
  provinceCode: string;
  city: string;
  district: string;
  postalCode: string;
  /** Id tujuan RajaOngkir (hasil pencarian). Kosong untuk isian manual / mode tarif tetap. */
  destinationId?: string;
};

/** Satu pilihan pengiriman yang bisa dipilih pembeli. */
export type ShippingOption = {
  /** "kurir:layanan" (mis. "jne:REG") atau "standar" untuk tarif tetap provinsi. */
  id: string;
  courier: string;
  service: string;
  label: string;
  description: string;
  cost: number;
  etd: string | null;
};

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

/** Sumber tarif ongkir: tarif tetap per provinsi, atau API kurir. */
export interface ShippingRateProvider {
  quotes(input: { destination: ShippingDestination; weightGrams: number }): Promise<ShippingOption[]>;
}
