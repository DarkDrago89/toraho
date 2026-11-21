/**
 * Pembatas sederhana per kunci (mis. IP) dengan jendela waktu tetap, di memori.
 * Di serverless tiap instance punya hitungannya sendiri — cukup sebagai rem terhadap skrip iseng,
 * bukan perlindungan penuh. Kuota API tetap dilindungi cache database.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function allow(key: string): boolean {
    const t = now();
    const cur = hits.get(key);
    if (!cur || cur.resetAt <= t) {
      if (hits.size > 5000) hits.clear(); // cegah peta tumbuh tanpa batas
      hits.set(key, { count: 1, resetAt: t + windowMs });
      return true;
    }
    if (cur.count >= limit) return false;
    cur.count++;
    return true;
  };
}
