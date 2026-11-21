import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMidtransProvider, verifyMidtransSignature } from "./midtrans";

const KEY = "SB-Mid-server-TEST";

describe("verifyMidtransSignature", () => {
  const n = { order_id: "TRH-261121-ABCD", status_code: "200", gross_amount: "373000.00" };
  const good = createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + KEY).digest("hex");

  it("menerima tanda tangan yang benar", () => {
    expect(verifyMidtransSignature({ ...n, signature_key: good }, KEY)).toBe(true);
  });
  it("menolak tanda tangan yang salah atau kosong", () => {
    expect(verifyMidtransSignature({ ...n, signature_key: good.replace(/.$/, "0") }, KEY)).toBe(false);
    expect(verifyMidtransSignature({ ...n, signature_key: "" }, KEY)).toBe(false);
    expect(verifyMidtransSignature({ ...n, gross_amount: "1.00", signature_key: good }, KEY)).toBe(false);
  });
});

describe("createPayment", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mengirim Snap request hanya QRIS + VA, dengan expiry dan gross_amount = total", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "tok", redirect_url: "https://app.sandbox.midtrans.com/snap/v4/redirection/tok" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = createMidtransProvider({ serverKey: KEY, isProduction: false, siteUrl: "http://localhost:3001" });

    const res = await provider.createPayment({
      code: "TRH-261121-ABCD",
      total: 373000,
      customerName: "Budi",
      phone: "081234567890",
      items: [{ name: "Kaos Honoo (M)", price: 179000, qty: 2 }],
      shippingCost: 15000,
      expiryHours: 24,
    });

    expect(res).toEqual({ token: "tok", redirectUrl: "https://app.sandbox.midtrans.com/snap/v4/redirection/tok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(init.headers.Authorization).toBe("Basic " + Buffer.from(KEY + ":").toString("base64"));
    const body = JSON.parse(init.body);
    expect(body.transaction_details).toEqual({ order_id: "TRH-261121-ABCD", gross_amount: 373000 });
    expect(body.enabled_payments).toContain("other_qris");
    expect(body.enabled_payments).toContain("bca_va");
    expect(body.enabled_payments).not.toContain("credit_card");
    expect(body.expiry).toMatchObject({ unit: "hour", duration: 24 });
    const itemSum = body.item_details.reduce((n: number, i: { price: number; quantity: number }) => n + i.price * i.quantity, 0);
    expect(itemSum).toBe(373000);
    expect(body.item_details.at(-1)).toMatchObject({ id: "ONGKIR", price: 15000, quantity: 1 });
    expect(body.callbacks.finish).toBe("http://localhost:3001/pesanan/TRH-261121-ABCD?hp=081234567890");
  });

  it("memakai endpoint production bila diaktifkan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "t", redirect_url: "u" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await createMidtransProvider({ serverKey: KEY, isProduction: true, siteUrl: "https://toraho.id" }).createPayment({
      code: "X",
      total: 1000,
      customerName: "A",
      phone: "081234567890",
      items: [{ name: "A", price: 1000, qty: 1 }],
      shippingCost: 0,
      expiryHours: 1,
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://app.midtrans.com/snap/v1/transactions");
  });

  it("melempar error yang jelas bila Midtrans menolak", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error_messages: ["Access denied"] }), { status: 401 })));
    await expect(
      createMidtransProvider({ serverKey: KEY, isProduction: false, siteUrl: "x" }).createPayment({
        code: "X",
        total: 1000,
        customerName: "A",
        phone: "0812",
        items: [{ name: "A", price: 1000, qty: 1 }],
        shippingCost: 0,
        expiryHours: 1,
      }),
    ).rejects.toThrow("Midtrans 401: Access denied");
  });
});
