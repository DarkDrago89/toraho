import { describe, expect, it } from "vitest";
import { PROVINCES, provinceCodeFromName } from "./provinces";

describe("provinceCodeFromName", () => {
  it("mengenali ke-38 nama resmi, huruf besar maupun kecil", () => {
    for (const p of PROVINCES) {
      expect(provinceCodeFromName(p.name)).toBe(p.code);
      expect(provinceCodeFromName(p.name.toUpperCase())).toBe(p.code);
    }
  });

  it("mengenali ejaan lain yang umum dipakai API kurir", () => {
    expect(provinceCodeFromName("DAERAH ISTIMEWA YOGYAKARTA")).toBe("YO");
    expect(provinceCodeFromName("D.I. Yogyakarta")).toBe("YO");
    expect(provinceCodeFromName("NANGGROE ACEH DARUSSALAM (NAD)")).toBe("AC");
    expect(provinceCodeFromName("NUSA TENGGARA BARAT (NTB)")).toBe("NB");
    expect(provinceCodeFromName("NUSA TENGGARA TIMUR (NTT)")).toBe("NT");
    expect(provinceCodeFromName("BANGKA BELITUNG")).toBe("BB");
    expect(provinceCodeFromName("Kep. Bangka Belitung")).toBe("BB");
    expect(provinceCodeFromName("KEP. RIAU")).toBe("KR");
    expect(provinceCodeFromName("JAKARTA")).toBe("JK");
    expect(provinceCodeFromName("  dki   jakarta ")).toBe("JK");
  });

  it("nama tidak dikenal → null", () => {
    expect(provinceCodeFromName("Atlantis")).toBeNull();
    expect(provinceCodeFromName("")).toBeNull();
  });
});
