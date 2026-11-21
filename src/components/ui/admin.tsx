/** Potongan UI kecil yang dipakai bersama di halaman admin. */

/** Gaya input tanpa lebar & margin, untuk dipakai di baris/grid yang mengatur lebarnya sendiri. */
export const fieldCls =
  "border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-paper focus:outline-none";

export const inputCls = `mt-1.5 w-full ${fieldCls}`;

export const btnPrimary =
  "inline-flex items-center justify-center bg-paper px-5 py-2.5 text-xs font-bold tracking-[0.2em] text-ink uppercase hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhost =
  "inline-flex items-center justify-center border border-line px-4 py-2 text-xs tracking-[0.15em] uppercase hover:border-paper disabled:opacity-40";

export function PageHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display mt-1 text-3xl sm:text-4xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Label({ text, children, hint }: { text: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs tracking-[0.15em] text-muted uppercase">
      {text}
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] tracking-normal normal-case">{hint}</span>}
    </label>
  );
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="border border-red-400/60 bg-red-950/30 p-3 text-sm text-red-200">
      <ul className="list-disc pl-5">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
