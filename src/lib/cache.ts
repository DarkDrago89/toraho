import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Cache kunci–nilai dengan masa berlaku. Nilai harus bisa disimpan sebagai JSON. */
export interface KeyValueCache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
}

/** Cache di memori (untuk tes dan skrip). */
export function memoryCache(now: () => number = Date.now): KeyValueCache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    async get<T>(key: string) {
      const hit = store.get(key);
      if (!hit || hit.expiresAt <= now()) return undefined;
      return hit.value as T;
    },
    async set(key, value, ttlMs) {
      store.set(key, { value, expiresAt: now() + ttlMs });
    },
  };
}

/**
 * Cache di tabel ApiCache. Dipakai di server karena Vercel menjalankan banyak instance:
 * cache memori per instance akan sering kosong dan kuota API cepat habis.
 */
export function dbCache(now: () => Date = () => new Date()): KeyValueCache {
  return {
    async get<T>(key: string) {
      const row = await prisma.apiCache.findUnique({ where: { key } });
      if (!row || row.expiresAt <= now()) return undefined;
      return row.value as T;
    },
    async set(key, value, ttlMs) {
      const expiresAt = new Date(now().getTime() + ttlMs);
      const json = value as Prisma.InputJsonValue;
      await prisma.apiCache.upsert({ where: { key }, create: { key, value: json, expiresAt }, update: { value: json, expiresAt } });
      // Bersih-bersih ringan: sesekali hapus baris yang sudah kedaluwarsa.
      if (Math.random() < 0.02) await prisma.apiCache.deleteMany({ where: { expiresAt: { lt: now() } } });
    },
  };
}
