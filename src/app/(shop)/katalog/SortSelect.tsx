"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "harga-naik", label: "Harga terendah" },
  { value: "harga-turun", label: "Harga tertinggi" },
];

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-3 text-xs tracking-[0.2em] text-muted uppercase">
      Urutkan
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value === "terbaru") next.delete("urut");
          else next.set("urut", e.target.value);
          router.push(`${pathname}${next.size ? `?${next}` : ""}`);
        }}
        className="border border-line bg-ink px-3 py-2 text-paper normal-case tracking-normal"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
