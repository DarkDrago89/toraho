import { describe, expect, it, vi } from "vitest";
import { memoryCache } from "@/lib/cache";
import { createRajaOngkirClient, ShippingApiError } from "./rajaongkir";

type Call = { url: string; init?: RequestInit };

/** fetch tiruan: mencatat panggilan dan mengembalikan respons yang disiapkan. */
function fakeFetch(...responses: Array<{ status: number; body: unknown } | Error>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses.shift();
    if (!r) throw new Error("tidak ada respons tersisa");
    if (r instanceof Error) throw r;
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), { status: r.status });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const meta = (code: number, message = "ok") => ({ message, code, status: code < 400 ? "success" : "error" });

const DEST = {
  id: 31555,
  label: "CIBUBUR, CIRACAS, JAKARTA TIMUR, DKI JAKARTA, 13720",
  province_name: "DKI JAKARTA",
  city_name: "JAKARTA TIMUR",
  district_name: "CIRACAS",
  subdistrict_name: "CIBUBUR",
  zip_code: "13720",
};

const client = (fetchFn: typeof fetch, now = () => 0) =>
  createRajaOngkirClient({ apiKey: "kunci-uji", fetchFn, cache: memoryCache(now), baseUrl: "https://ro.test/api/v1" });

describe("searchDestinations", () => {
  it("memanggil endpoint pencarian dengan header key dan memetakan hasil", async () => {
    const f = fakeFetch({ status: 200, body: { meta: meta(200), data: [DEST] } });
    const r = await client(f.fn).searchDestinations("  Cibubur ");
    expect(f.calls[0].url).toBe("https://ro.test/api/v1/destination/domestic-destination?search=Cibubur&limit=10&offset=0");
    expect(new Headers(f.calls[0].init?.headers).get("key")).toBe("kunci-uji");
    expect(r).toEqual([
      {
        id: "31555",
        label: DEST.label,
        provinceCode: "JK",
        city: "JAKARTA TIMUR",
        district: "CIRACAS",
        subdistrict: "CIBUBUR",
        postalCode: "13720",
      },
    ]);
  });

  it("404 atau data null → daftar kosong", async () => {
    const f = fakeFetch(
      { status: 404, body: { meta: meta(404, "Domestic Destinations Data not found"), data: null } },
      { status: 200, body: { meta: meta(200), data: null } },
    );
    const c = client(f.fn);
    expect(await c.searchDestinations("zzzz")).toEqual([]);
    expect(await c.searchDestinations("yyyy")).toEqual([]);
  });

  it("menyaring hasil dengan provinsi yang tidak dikenali", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = fakeFetch({ status: 200, body: { meta: meta(200), data: [DEST, { ...DEST, id: 2, province_name: "ATLANTIS" }] } });
    expect((await client(f.fn).searchDestinations("cibubur")).map((d) => d.id)).toEqual(["31555"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("hasil disimpan di cache: kata kunci sama (beda huruf) tidak memanggil API lagi, kedaluwarsa memanggil lagi", async () => {
    let t = 0;
    const f = fakeFetch({ status: 200, body: { meta: meta(200), data: [DEST] } }, { status: 200, body: { meta: meta(200), data: [] } });
    const c = client(f.fn, () => t);
    await c.searchDestinations("Cibubur");
    expect(await c.searchDestinations("cibubur")).toHaveLength(1);
    expect(f.calls).toHaveLength(1);
    t = 8 * 24 * 3600_000;
    expect(await c.searchDestinations("cibubur")).toEqual([]);
    expect(f.calls).toHaveLength(2);
  });

  it("401, 5xx, JSON rusak, atau jaringan gagal → ShippingApiError", async () => {
    for (const r of [
      { status: 401, body: { meta: meta(401, "Unauthorized"), data: null } },
      { status: 500, body: { meta: meta(500, "Server Error"), data: null } },
      { status: 200, body: "<html>bukan json</html>" },
      new TypeError("fetch failed"),
    ]) {
      const f = fakeFetch(r);
      await expect(client(f.fn).searchDestinations("cibubur")).rejects.toBeInstanceOf(ShippingApiError);
    }
  });
});

describe("lookupDestination", () => {
  it("menemukan tujuan dari hasil pencarian sebelumnya tanpa memanggil API lagi", async () => {
    const f = fakeFetch({ status: 200, body: { meta: meta(200), data: [DEST] } });
    const c = client(f.fn);
    await c.searchDestinations("cibubur");
    expect(await c.lookupDestination("31555", "13720")).toMatchObject({ id: "31555", subdistrict: "CIBUBUR", provinceCode: "JK" });
    expect(f.calls).toHaveLength(1);
  });

  it("belum pernah dicari → dicari lewat kode pos; id tidak ada di hasil → null", async () => {
    const f = fakeFetch(
      { status: 200, body: { meta: meta(200), data: [DEST] } },
      { status: 200, body: { meta: meta(200), data: [DEST] } },
    );
    const c = client(f.fn);
    expect(await c.lookupDestination("31555", "13720")).toMatchObject({ id: "31555" });
    expect(f.calls[0].url).toContain("search=13720&limit=50");
    expect(await c.lookupDestination("99999", "13721")).toBeNull();
  });

  it("tanpa kode pos dan tidak ada di cache → null tanpa memanggil API", async () => {
    const f = fakeFetch();
    expect(await client(f.fn).lookupDestination("31555", "")).toBeNull();
    expect(f.calls).toHaveLength(0);
  });
});

describe("calculate", () => {
  const input = { origin: "1001", destination: "31555", weightGrams: 849.6, couriers: ["jne", "jnt", "sicepat"] };

  it("mengirim form-urlencoded dan memetakan layanan", async () => {
    const f = fakeFetch({
      status: 200,
      body: {
        meta: meta(200),
        data: [
          { name: "Jalur Nugraha Ekakurir (JNE)", code: "jne", service: "REG", description: "Layanan Reguler", cost: 18000, etd: "2-3 day" },
          { name: "SiCepat Express", code: "sicepat", service: "BEST", description: "Besok Sampai Tujuan", cost: 25000, etd: "1 day" },
          { name: "J&T Express", code: "jnt", service: "EZ", description: "Reguler", cost: 17000, etd: "" },
          { name: "Rusak", code: "jne", service: "X", description: "", cost: 0, etd: "1" },
        ],
      },
    });
    const r = await client(f.fn).calculate(input);
    expect(f.calls[0].url).toBe("https://ro.test/api/v1/calculate/domestic-cost");
    expect(f.calls[0].init?.method).toBe("POST");
    const body = new URLSearchParams(String(f.calls[0].init?.body));
    expect(Object.fromEntries(body)).toEqual({ origin: "1001", destination: "31555", weight: "850", courier: "jne:jnt:sicepat" });
    expect(new Headers(f.calls[0].init?.headers).get("content-type")).toBe("application/x-www-form-urlencoded");
    expect(r).toEqual([
      { courier: "jne", courierName: "Jalur Nugraha Ekakurir (JNE)", service: "REG", description: "Layanan Reguler", cost: 18000, etd: "2–3 hari" },
      { courier: "sicepat", courierName: "SiCepat Express", service: "BEST", description: "Besok Sampai Tujuan", cost: 25000, etd: "1 hari" },
      { courier: "jnt", courierName: "J&T Express", service: "EZ", description: "Reguler", cost: 17000, etd: null },
    ]);
  });

  it("berat minimal 1 gram", async () => {
    const f = fakeFetch({ status: 200, body: { meta: meta(200), data: [] } });
    await client(f.fn).calculate({ ...input, weightGrams: 0 });
    expect(new URLSearchParams(String(f.calls[0].init?.body)).get("weight")).toBe("1");
  });

  it("400 'not found' (tidak ada layanan ke tujuan ini) → daftar kosong", async () => {
    const f = fakeFetch({ status: 400, body: { meta: meta(400, "Calculate Domestic Shipping Cost not found"), data: null } });
    expect(await client(f.fn).calculate(input)).toEqual([]);
  });

  it("parameter salah, kurir tidak valid, atau server error → ShippingApiError", async () => {
    for (const r of [
      { status: 400, body: { meta: meta(400, "Missing Params"), data: null } },
      { status: 422, body: { meta: meta(422, "Invalid Courier"), data: null } },
      { status: 503, body: "Service Unavailable" },
    ]) {
      const f = fakeFetch(r);
      await expect(client(f.fn).calculate(input)).rejects.toBeInstanceOf(ShippingApiError);
    }
  });

  it("hasil tarif di-cache 30 menit; error tidak di-cache", async () => {
    let t = 0;
    const ok = { status: 200, body: { meta: meta(200), data: [{ name: "JNE", code: "jne", service: "REG", description: "", cost: 18000, etd: "2-3" }] } };
    const f = fakeFetch({ status: 500, body: "err" }, ok, ok);
    const c = client(f.fn, () => t);
    await expect(c.calculate(input)).rejects.toBeInstanceOf(ShippingApiError);
    await c.calculate(input);
    await c.calculate(input);
    expect(f.calls).toHaveLength(2);
    t = 31 * 60_000;
    await c.calculate(input);
    expect(f.calls).toHaveLength(3);
  });
});
