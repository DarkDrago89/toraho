import { provinceName } from "./provinces";
import type { ShippingDestination, ShippingOption, ShippingRateProvider } from "./types";

export const STANDARD_OPTION_ID = "standar";

/** Tarif tetap per provinsi tujuan (diatur admin), tidak bergantung berat. Juga cadangan saat API kurir gagal. */
export class ProvinceRateProvider implements ShippingRateProvider {
  constructor(private readonly rates: Record<string, number>) {}

  async quotes({ destination }: { destination: ShippingDestination; weightGrams: number }): Promise<ShippingOption[]> {
    const cost = this.rates[destination.provinceCode];
    if (cost === undefined || cost <= 0) return [];
    return [
      {
        id: STANDARD_OPTION_ID,
        courier: "standar",
        service: "Tarif standar",
        label: `Tarif standar ${provinceName(destination.provinceCode)}`,
        description: "",
        cost,
        etd: null,
      },
    ];
  }
}
