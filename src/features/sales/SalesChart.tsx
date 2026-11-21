"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";

type Point = { date: string; revenue: number };

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(n));

/**
 * Omzet harian, satu seri → tanpa legenda (judul yang menamainya).
 * Batang tipis monokrom, ujung atas membulat 4px, celah 2px, grid samar, tooltip per batang,
 * dan tabel data untuk pembaca layar / yang butuh angka persis.
 */
export function SalesChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { l: 44, r: 8, t: 12, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.revenue));
  // Skala "rapi": 1/2/5 × 10^n
  const pow = 10 ** Math.floor(Math.log10(max));
  const niceMax = [1, 2, 5, 10].map((k) => k * pow).find((v) => v >= max) ?? max;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(28, slot - 2));
  const y = (v: number) => pad.t + innerH - (v / niceMax) * innerH;
  const ticks = [0, 0.5, 1].map((f) => f * niceMax);
  const labelEvery = Math.ceil(data.length / 8);
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik omzet harian">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--color-muted)">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * slot + (slot - barW) / 2;
          const top = y(d.revenue);
          const hgt = pad.t + innerH - top;
          const r = Math.min(4, barW / 2, hgt);
          const path =
            hgt <= 0
              ? ""
              : `M${x},${pad.t + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.t + innerH} Z`;
          return (
            <g key={d.date}>
              {path && <path d={path} fill="var(--color-paper)" opacity={hover === null || hover === i ? 0.92 : 0.35} />}
              {/* Area hover lebih besar dari batang */}
              <rect
                x={pad.l + i * slot}
                y={pad.t}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${shortDate(d.date)}: ${formatRupiah(d.revenue)}`}
              />
              {i % labelEvery === 0 && (
                <text x={pad.l + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
                  {shortDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 border border-line-strong bg-ink-2 px-3 py-2 text-xs shadow-lg"
          style={{ left: `clamp(0px, calc(${((pad.l + hover * slot + slot / 2) / W) * 100}% - 60px), calc(100% - 130px))` }}
        >
          <p className="text-muted">{shortDate(h.date)}</p>
          <p className="font-semibold tabular-nums">{formatRupiah(h.revenue)}</p>
        </div>
      )}
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer hover:text-paper">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full max-w-sm">
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-b border-line">
                <td className="py-1">{shortDate(d.date)}</td>
                <td className="py-1 text-right tabular-nums">{formatRupiah(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
