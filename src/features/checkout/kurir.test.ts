import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { setShippingRates } from "@/features/settings/service";
import { ShippingApiError } from "@/lib/shipping/rajaongkir";
import { makeProduct } from "@/test/factory";
import { createOrder, type CheckoutInput } from "./service";

// RajaOngkir tiruan: createOrder harus menghitung ulang ongkir dan menentukan alamat dari data server.
const ro = vi.hoisted(() => ({ calculate: vi.fn(), lookupDestination: vi.fn(), searchDestinations: vi.fn() }));
vi.mock("@/lib/shipping/config", () => ({
  getRajaOngkirConfig: vi.fn(async () => ({ client: ro, origin: { id: "100", label: "Asal" }, couriers: ["jne", "jnt"] })),
}));

const DEST = {
  id: "31555",
  label: "CIBUBUR, CIRACAS, JAKARTA TIMUR, DKI JAKARTA, 13720",
  provinceCode: "JK",
  city: "JAKARTA TIMUR",
  district: "CIRACAS",
  subdistrict: "CIBUBUR",
  postalCode: "13720",
};
const REG = { courier: "jne", courierName: "JNE", service: "REG", description: "Reguler", cost: 18000, etd: "2–3 hari" };

async function input(over: Partial<CheckoutInput> = {}): Promise<CheckoutInput> {
  const { variant } = await makeProduct({ price: 100000, weightGrams: 400, stock: 5 });
  return {
    lines: [{ variantId: variant.id, qty: 1 }],
    customerName: "Sari",
    phone: "081234567890",
    email: "",
    // Isian wilayah dari browser sengaja beda: server harus memakai data tujuan dari RajaOngkir.
    provinceCode: "JB",
    city: "Bandung",
    district: "Coblong",
    postalCode: "13720",
    addressLine: "Jl. Raya Cibubur 1",
    paymentMethod: "MANUAL",
    destinationId: "31555",
    shippingOptionId: "jne:REG",
    expectedShippingCost: 18000,
    ...over,
  };
}

beforeEach(async () => {
  ro.calculate.mockReset().mockResolvedValue([REG]);
  ro.lookupDestination.mockReset().mockResolvedValue(DEST);
  await setShippingRates({ JK: 20000 });
});

describe("createOrder dengan ongkir kurir", () => {
  it("menyimpan kurir, layanan, estimasi, dan alamat wilayah dari server", async () => {
    const r = await createOrder(await input());
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o).toMatchObject({
      provinceCode: "JK",
      city: "JAKARTA TIMUR",
      district: "CIRACAS",
      subdistrict: "CIBUBUR",
      postalCode: "13720",
      shippingDestinationId: "31555",
      courierCode: "jne",
      courierService: "REG",
      shippingEtd: "2–3 hari",
      shippingCost: 18000,
      total: 118000,
      weightGrams: 400,
    });
    expect(ro.calculate).toHaveBeenCalledWith({ origin: "100", destination: "31555", weightGrams: 400, couriers: ["jne", "jnt"] });
    expect(ro.lookupDestination).toHaveBeenCalledWith("31555", "13720");
  });

  it("layanan yang dipilih tidak ada lagi → diminta memilih ulang", async () => {
    const r = await createOrder(await input({ shippingOptionId: "jne:YES" }));
    expect(r).toEqual({ ok: false, errors: ["Ongkir berubah, silakan pilih ulang layanan kurir"] });
  });

  it("harga yang dilihat pembeli berbeda dari hitungan server → diminta memilih ulang", async () => {
    const r = await createOrder(await input({ expectedShippingCost: 15000 }));
    expect(r).toEqual({ ok: false, errors: ["Ongkir berubah, silakan pilih ulang layanan kurir"] });
  });

  it("RajaOngkir gagal saat pesanan dibuat, padahal pembeli memilih layanan kurir → coba lagi", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    ro.calculate.mockRejectedValue(new ShippingApiError("timeout"));
    const r = await createOrder(await input());
    expect(r).toEqual({ ok: false, errors: ["Gagal menghitung ongkir, coba lagi"] });
  });

  it("RajaOngkir gagal dan pembeli memilih tarif standar → pesanan jadi dengan tarif provinsi tujuan", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    ro.calculate.mockRejectedValue(new ShippingApiError("timeout"));
    const r = await createOrder(await input({ shippingOptionId: "standar", expectedShippingCost: 20000 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o).toMatchObject({ courierCode: "standar", shippingCost: 20000, provinceCode: "JK", subdistrict: "CIBUBUR", shippingDestinationId: "31555" });
  });

  it("id tujuan tidak dikenali server → alamat diminta dipilih ulang", async () => {
    ro.lookupDestination.mockResolvedValue(null);
    const r = await createOrder(await input());
    expect(r).toEqual({ ok: false, errors: ["Alamat tujuan tidak valid, silakan pilih ulang"] });
  });

  it("pencarian tujuan di server gagal → coba lagi", async () => {
    ro.lookupDestination.mockRejectedValue(new ShippingApiError("down"));
    const r = await createOrder(await input());
    expect(r).toEqual({ ok: false, errors: ["Gagal menghitung ongkir, coba lagi"] });
  });

  it("stok tidak ditahan jika ongkir gagal", async () => {
    const i = await input({ shippingOptionId: "jne:YES" });
    const before = (await prisma.variant.findUniqueOrThrow({ where: { id: i.lines[0].variantId } })).stock;
    await createOrder(i);
    expect((await prisma.variant.findUniqueOrThrow({ where: { id: i.lines[0].variantId } })).stock).toBe(before);
  });
});
