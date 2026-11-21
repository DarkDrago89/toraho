import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getSettings, getShippingRates, setShippingRates, updateSettings } from "./service";

beforeEach(async () => {
  await prisma.setting.deleteMany();
  await prisma.shippingRate.deleteMany();
});

describe("pengaturan toko", () => {
  it("memberi nilai default saat database kosong", async () => {
    expect(await getSettings()).toEqual({ paymentWindowHours: 24, whatsapp: "", bankAccounts: [] });
  });

  it("memperbarui sebagian tanpa mengubah field lain", async () => {
    await updateSettings({ whatsapp: "081234567890" });
    await updateSettings({ paymentWindowHours: 12 });
    expect(await getSettings()).toEqual({ paymentWindowHours: 12, whatsapp: "081234567890", bankAccounts: [] });
  });
});

describe("tarif ongkir", () => {
  it("menyimpan tarif dan menghapus provinsi bernilai 0", async () => {
    await setShippingRates({ JT: 18000 });
    await setShippingRates({ JB: 15000, JT: 0 });
    expect(await getShippingRates()).toEqual({ JB: 15000 });
  });
});
