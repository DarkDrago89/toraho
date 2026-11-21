import { describe, expect, it } from "vitest";
import { ProvinceRateProvider } from "./province-rate";
import { PROVINCES } from "./provinces";

const dest = (provinceCode: string) => ({ provinceCode, city: "Bandung", district: "Coblong", postalCode: "40132" });

describe("ProvinceRateProvider", () => {
  const provider = new ProvinceRateProvider({ JB: 15000 });

  it("mengembalikan tarif tetap provinsi, tidak bergantung berat", async () => {
    expect(await provider.quote({ destination: dest("JB"), weightGrams: 3000 })).toEqual({
      cost: 15000,
      label: "Tarif tetap Jawa Barat",
    });
  });

  it("mengembalikan null untuk provinsi tanpa tarif", async () => {
    expect(await provider.quote({ destination: dest("PA"), weightGrams: 500 })).toBeNull();
  });
});

describe("PROVINCES", () => {
  it("berisi 38 provinsi dengan kode unik", () => {
    expect(PROVINCES).toHaveLength(38);
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(38);
  });
});
