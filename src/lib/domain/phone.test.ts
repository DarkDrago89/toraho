import { describe, expect, it } from "vitest";
import { normalizePhone, toWaNumber } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["081234567890", "081234567890"],
    ["+62 812-3456-7890", "081234567890"],
    ["6281234567890", "081234567890"],
    ["0812 3456 789", "08123456789"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(["", "12345", "0812345678901234", "abc0812345678", "021"])("menolak %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe("toWaNumber", () => {
  it("mengubah 08xx menjadi 628xx untuk wa.me", () => {
    expect(toWaNumber("081234567890")).toBe("6281234567890");
  });
});
