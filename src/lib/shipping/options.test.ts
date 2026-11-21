import { describe, expect, it, vi } from "vitest";
import { getShippingOptions, STANDARD_OPTION_ID } from "./index";
import { ShippingApiError, type RajaOngkirClient, type RawService } from "./rajaongkir";

const dest = { provinceCode: "JB", city: "Bandung", district: "Coblong", postalCode: "40132", destinationId: "777" };
const rates = { JB: 15000 };

function config(calculate: () => Promise<RawService[]>) {
  const client = { calculate: vi.fn(calculate), searchDestinations: vi.fn(), lookupDestination: vi.fn() } as unknown as RajaOngkirClient;
  return { client, origin: { id: "100", label: "Asal" }, couriers: ["jne", "jnt"] };
}

const svc = (courier: string, service: string, cost: number, etd: string | null = "2–3 hari"): RawService => ({
  courier,
  courierName: courier.toUpperCase(),
  service,
  description: `Layanan ${service}`,
  cost,
  etd,
});

describe("getShippingOptions", () => {
  it("mode kurir: opsi dari RajaOngkir diurutkan dari termurah, dengan id kurir:layanan", async () => {
    const c = config(async () => [svc("jne", "YES", 30000, "1 hari"), svc("jnt", "EZ", 17000), svc("jne", "REG", 18000)]);
    const r = await getShippingOptions({ destination: dest, weightGrams: 850 }, { config: c, rates });
    expect(r.fallback).toBe(false);
    expect(r.options.map((o) => [o.id, o.cost])).toEqual([
      ["jnt:EZ", 17000],
      ["jne:REG", 18000],
      ["jne:YES", 30000],
    ]);
    expect(r.options[1]).toMatchObject({ courier: "jne", service: "REG", label: "JNE REG", etd: "2–3 hari", description: "Layanan REG" });
    expect(c.client.calculate).toHaveBeenCalledWith({ origin: "100", destination: "777", weightGrams: 850, couriers: ["jne", "jnt"] });
  });

  it("API gagal → satu opsi tarif standar (fallback)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = config(async () => {
      throw new ShippingApiError("kuota habis", 429);
    });
    const r = await getShippingOptions({ destination: dest, weightGrams: 850 }, { config: c, rates });
    expect(r).toEqual({
      fallback: true,
      options: [{ id: STANDARD_OPTION_ID, courier: "standar", service: "Tarif standar", label: "Tarif standar Jawa Barat", description: "", cost: 15000, etd: null }],
    });
    warn.mockRestore();
  });

  it("tidak ada layanan kurir ke tujuan → tarif standar (fallback)", async () => {
    const r = await getShippingOptions({ destination: dest, weightGrams: 850 }, { config: config(async () => []), rates });
    expect(r.fallback).toBe(true);
    expect(r.options.map((o) => o.id)).toEqual([STANDARD_OPTION_ID]);
  });

  it("RajaOngkir belum dikonfigurasi → mode standar biasa (bukan fallback)", async () => {
    const r = await getShippingOptions({ destination: dest, weightGrams: 850 }, { config: null, rates });
    expect(r).toMatchObject({ fallback: false, options: [{ id: STANDARD_OPTION_ID, cost: 15000 }] });
  });

  it("tanpa id tujuan (isian manual) → tarif standar walau RajaOngkir aktif", async () => {
    const c = config(async () => [svc("jne", "REG", 18000)]);
    const r = await getShippingOptions({ destination: { ...dest, destinationId: undefined }, weightGrams: 850 }, { config: c, rates });
    expect(r.options.map((o) => o.id)).toEqual([STANDARD_OPTION_ID]);
    expect(c.client.calculate).not.toHaveBeenCalled();
  });

  it("provinsi tanpa tarif standar dan API gagal → tidak ada opsi", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = config(async () => {
      throw new ShippingApiError("down");
    });
    const r = await getShippingOptions({ destination: { ...dest, provinceCode: "PA" }, weightGrams: 850 }, { config: c, rates });
    expect(r).toEqual({ fallback: true, options: [] });
    warn.mockRestore();
  });

  it("error selain ShippingApiError tidak ditelan", async () => {
    const c = config(async () => {
      throw new Error("bug");
    });
    await expect(getShippingOptions({ destination: dest, weightGrams: 850 }, { config: c, rates })).rejects.toThrow("bug");
  });
});
