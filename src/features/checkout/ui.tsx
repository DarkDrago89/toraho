/**
 * Gaya isian checkout. Mengikuti guide modern-web-guidance `forms`:
 * - huruf ≥ 16px (text-base) agar iOS tidak memperbesar layar saat input difokuskan;
 * - cincin fokus yang jelas (focus-visible), bukan hanya perubahan warna border;
 * - border dengan kontras ≥ 3:1 terhadap latar (border-muted/70 di atas ink-2).
 */
export const inputCls =
  "mt-1.5 w-full border border-muted/70 bg-ink-2 px-3 py-3 text-base text-paper placeholder:text-muted/60 focus:border-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs tracking-[0.15em] text-muted uppercase">
      {label}
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] tracking-normal normal-case">{hint}</span>}
    </label>
  );
}

/** Kartu pilihan radio (alamat, kurir, metode bayar): seluruh kartu bisa diklik, border terang saat dipilih. */
export const choiceCls =
  "flex cursor-pointer gap-3 border border-line p-4 transition hover:border-muted has-[:checked]:border-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-paper";
