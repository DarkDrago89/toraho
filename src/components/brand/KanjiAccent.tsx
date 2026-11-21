/** Kanji 虎火 vertikal sebagai aksen samar. Dekoratif saja, disembunyikan dari pembaca layar. */
export function KanjiAccent({ text = "虎火", className = "" }: { text?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none select-none font-[family-name:var(--font-jp)] font-bold leading-none opacity-15 [writing-mode:vertical-rl] ${className}`}
    >
      {text}
    </span>
  );
}
