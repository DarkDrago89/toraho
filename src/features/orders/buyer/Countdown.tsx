"use client";

import { useEffect, useState } from "react";

/** Sisa waktu bayar, diperbarui tiap detik. */
export function Countdown({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [end]);

  if (left === null) return <span className="tabular-nums">--:--:--</span>;
  if (left === 0) return <span>Waktu habis</span>;
  const h = Math.floor(left / 3600_000);
  const m = Math.floor((left % 3600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return <span className="tabular-nums">{[h, m, s].map((n) => String(n).padStart(2, "0")).join(":")}</span>;
}

export function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="border border-line px-2 py-1 text-[0.65rem] tracking-[0.15em] uppercase hover:border-paper"
    >
      {copied ? "Tersalin" : label}
    </button>
  );
}
