import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShippingApiError } from "@/lib/shipping/rajaongkir";

const state = vi.hoisted(() => ({ configured: true, searchDestinations: vi.fn() }));
vi.mock("@/lib/shipping/config", () => ({
  // Pencarian cukup butuh API key (asal pengiriman diatur admin memakai pencarian ini juga).
  getRajaOngkirClient: vi.fn(() => (state.configured ? { searchDestinations: state.searchDestinations } : null)),
}));

const { GET } = await import("./route");

let ipSeq = 0;
const req = (q: string, ip = `10.0.0.${++ipSeq}`) =>
  new NextRequest(`http://localhost/api/ongkir/tujuan?q=${encodeURIComponent(q)}`, { headers: { "x-forwarded-for": ip } });

beforeEach(() => {
  state.configured = true;
  state.searchDestinations.mockReset().mockResolvedValue([{ id: "1", label: "CIBUBUR" }]);
});

describe("GET /api/ongkir/tujuan", () => {
  it("kata kunci kurang dari 3 huruf → 400", async () => {
    expect((await GET(req("ci"))).status).toBe(400);
    expect(state.searchDestinations).not.toHaveBeenCalled();
  });

  it("mengembalikan hasil pencarian", async () => {
    const res = await GET(req("  cibubur "));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [{ id: "1", label: "CIBUBUR" }] });
    expect(state.searchDestinations).toHaveBeenCalledWith("cibubur", 10);
  });

  it("API key RajaOngkir belum diisi → 404 mode standar", async () => {
    state.configured = false;
    const res = await GET(req("cibubur"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ mode: "standar" });
  });

  it("RajaOngkir bermasalah → 503", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    state.searchDestinations.mockRejectedValue(new ShippingApiError("down"));
    expect((await GET(req("cibubur"))).status).toBe(503);
  });

  it("terlalu banyak pencarian dari satu IP → 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await GET(req(`cibubur${i}`, "10.9.9.9"))).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
