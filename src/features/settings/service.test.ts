import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getSettings, getShippingRates, saveSettings, saveShippingRates, setShippingRates, updateSettings } from "./service";

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

describe("validasi pengaturan", () => {
  it("batas waktu bayar harus 1–72 jam", async () => {
    expect(await saveSettings({ paymentWindowHours: 0, whatsapp: "", bankAccounts: [] })).toEqual({
      ok: false,
      errors: ["Batas waktu bayar harus 1–72 jam"],
    });
    expect((await saveSettings({ paymentWindowHours: 73, whatsapp: "", bankAccounts: [] })).ok).toBe(false);
  });

  it("nomor rekening hanya angka; WA dinormalkan", async () => {
    const bad = await saveSettings({ paymentWindowHours: 24, whatsapp: "", bankAccounts: [{ bank: "BCA", number: "12A45", holder: "Toraho" }] });
    expect(bad).toEqual({ ok: false, errors: ["Nomor rekening hanya boleh angka"] });
    const ok = await saveSettings({
      paymentWindowHours: 12,
      whatsapp: "+62 812-1111-2222",
      bankAccounts: [{ bank: " bca ", number: "123 456 7890", holder: "Toraho Store" }],
    });
    expect(ok).toEqual({ ok: true });
    expect(await getSettings()).toEqual({
      paymentWindowHours: 12,
      whatsapp: "081211112222",
      bankAccounts: [{ bank: "BCA", number: "1234567890", holder: "Toraho Store" }],
    });
  });

  it("nomor WA tidak valid ditolak", async () => {
    expect(await saveSettings({ paymentWindowHours: 24, whatsapp: "12345", bankAccounts: [] })).toEqual({
      ok: false,
      errors: ["Nomor WhatsApp tidak valid"],
    });
  });

  it("tarif ongkir negatif atau pecahan ditolak", async () => {
    expect(await saveShippingRates({ JB: -1 })).toEqual({ ok: false, errors: ["Tarif ongkir harus angka bulat ≥ 0"] });
    expect(await saveShippingRates({ XX: 1000 })).toEqual({ ok: false, errors: ["Kode provinsi tidak dikenal: XX"] });
    expect(await saveShippingRates({ JB: 16000 })).toEqual({ ok: true });
  });
});

describe("tarif ongkir", () => {
  it("menyimpan tarif dan menghapus provinsi bernilai 0", async () => {
    await setShippingRates({ JT: 18000 });
    await setShippingRates({ JB: 15000, JT: 0 });
    expect(await getShippingRates()).toEqual({ JB: 15000 });
  });
});
