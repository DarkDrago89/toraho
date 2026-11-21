import { describe, expect, it } from "vitest";
import { ProvinceRateProvider, STANDARD_OPTION_ID } from "./province-rate";
import { PROVINCES } from "./provinces";

const dest = (provinceCode: string) => ({ provinceCode, city: "Bandung", district: "Coblong", postalCode: "40132" });

describe("ProvinceRateProvider", () => {
  const provider = new ProvinceRateProvider({ JB: 15000 });

  it("mengembalikan satu opsi tarif standar provinsi, tidak bergantung berat", async () => {
    expect(await provider.quotes({ destination: dest("JB"), weightGrams: 3000 })).toEqual([
      { id: STANDARD_OPTION_ID, courier: "standar", service: "Tarif standar", label: "Tarif standar Jawa Barat", description: "", cost: 15000, etd: null },
    ]);
  });

  it("provinsi tanpa tarif → tidak ada opsi", async () => {
    expect(await provider.quotes({ destination: dest("PA"), weightGrams: 500 })).toEqual([]);
  });
});

describe("PROVINCES", () => {
  it("berisi 38 provinsi dengan kode unik", () => {
    expect(PROVINCES).toHaveLength(38);
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(38);
  });
});
