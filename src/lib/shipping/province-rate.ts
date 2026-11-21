import { provinceName } from "./provinces";
import type { ShippingRateProvider, ShippingQuote, ShippingDestination } from "./types";

/** Tahap 1: satu tarif tetap per pesanan berdasarkan provinsi tujuan, tidak bergantung berat. */
export class ProvinceRateProvider implements ShippingRateProvider {
  constructor(private readonly rates: Record<string, number>) {}

  async quote({ destination }: { destination: ShippingDestination; weightGrams: number }): Promise<ShippingQuote | null> {
    const cost = this.rates[destination.provinceCode];
    if (cost === undefined || cost <= 0) return null;
    return { cost, label: `Tarif tetap ${provinceName(destination.provinceCode)}` };
  }
}
