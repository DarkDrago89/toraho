import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("mengizinkan sampai batas per jendela waktu, per kunci", () => {
    let t = 0;
    const allow = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect([allow("a"), allow("a"), allow("a"), allow("a")]).toEqual([true, true, true, false]);
    expect(allow("b")).toBe(true);
    t = 999;
    expect(allow("a")).toBe(false);
    t = 1000;
    expect(allow("a")).toBe(true);
  });
});
