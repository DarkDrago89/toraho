import { describe, expect, it } from "vitest";
import { dbCache, memoryCache } from "./cache";
import { uid } from "@/test/factory";

describe("memoryCache", () => {
  it("menyimpan nilai sampai kedaluwarsa", async () => {
    let t = 1_000;
    const c = memoryCache(() => t);
    await c.set("a", { x: 1 }, 500);
    expect(await c.get("a")).toEqual({ x: 1 });
    t = 1_499;
    expect(await c.get("a")).toEqual({ x: 1 });
    t = 1_500;
    expect(await c.get("a")).toBeUndefined();
    expect(await c.get("tidak-ada")).toBeUndefined();
  });
});

describe("dbCache", () => {
  it("menyimpan di database (bisa dibaca instance lain) sampai kedaluwarsa", async () => {
    let t = new Date("2026-11-22T00:00:00Z");
    const key = uid("cache");
    await dbCache(() => t).set(key, [{ id: "1" }], 60_000);
    // Instance lain (objek cache baru) membaca nilai yang sama.
    expect(await dbCache(() => t).get(key)).toEqual([{ id: "1" }]);
    // Menimpa nilai lama.
    await dbCache(() => t).set(key, [], 60_000);
    expect(await dbCache(() => t).get(key)).toEqual([]);
    t = new Date(t.getTime() + 60_000);
    expect(await dbCache(() => t).get(key)).toBeUndefined();
  });
});
