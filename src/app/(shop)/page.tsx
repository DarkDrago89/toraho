import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { KanjiAccent } from "@/components/brand/KanjiAccent";

export default function HomePage() {
  return (
    <section className="grain relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_25%,#2a2a2a_0%,#0b0b0b_65%)]">
      <KanjiAccent className="absolute top-8 right-4 text-6xl sm:text-8xl" />
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center">
        <Logo variant="full" priority className="w-56 sm:w-72" />
        <h1 className="display mt-6 text-5xl sm:text-7xl">
          Api di dalam
          <br />
          harimau
        </h1>
        <Link
          href="/katalog"
          className="mt-8 bg-paper px-8 py-3 text-xs font-bold tracking-[0.25em] text-ink uppercase transition hover:bg-white"
        >
          Belanja Sekarang
        </Link>
      </div>
    </section>
  );
}
