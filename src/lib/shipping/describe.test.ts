import { describe, expect, it } from "vitest";
import { describeShipping, formatAddress } from "./describe";

describe("describeShipping", () => {
  it("layanan kurir: nama kurir + layanan + estimasi", () => {
    expect(describeShipping({ courierCode: "jne", courierService: "REG", shippingEtd: "2–3 hari" })).toBe("JNE REG · estimasi 2–3 hari");
    expect(describeShipping({ courierCode: "jnt", courierService: "EZ", shippingEtd: null })).toBe("J&T EZ");
    expect(describeShipping({ courierCode: "lion", courierService: "REGPACK", shippingEtd: null })).toBe("LION REGPACK");
  });

  it("tarif standar dan pesanan lama tanpa data kurir", () => {
    expect(describeShipping({ courierCode: "standar", courierService: "Tarif standar", shippingEtd: null })).toBe("Tarif standar toko");
    expect(describeShipping({ courierCode: null, courierService: null, shippingEtd: null })).toBeNull();
  });
});

describe("formatAddress", () => {
  const base = { addressLine: "Jl. Dago 1", district: "Coblong", city: "Bandung", provinceCode: "JB", postalCode: "40132" };

  it("menyertakan kelurahan jika ada", () => {
    expect(formatAddress({ ...base, subdistrict: "Dago" })).toBe("Jl. Dago 1, Dago, Coblong, Bandung, Jawa Barat 40132");
  });

  it("tanpa kelurahan (mode tarif standar / pesanan lama)", () => {
    expect(formatAddress({ ...base, subdistrict: null })).toBe("Jl. Dago 1, Coblong, Bandung, Jawa Barat 40132");
  });
});
