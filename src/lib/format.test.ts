import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRupiah } from "./format";

describe("formatDateTime", () => {
  it("menambahkan jam WIB", () => {
    expect(formatDateTime(new Date("2026-11-21T20:05:00Z"))).toBe("22/11/2026 03.05");
  });
});

describe("formatRupiah", () => {
  it("memakai titik sebagai pemisah ribuan", () => {
    expect(formatRupiah(489000)).toBe("Rp 489.000");
  });
  it("menampilkan nol", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
  });
});

describe("formatDate", () => {
  it("memakai zona WIB dan format dd/mm/yyyy", () => {
    expect(formatDate(new Date("2026-11-21T20:00:00Z"))).toBe("22/11/2026");
  });
});
