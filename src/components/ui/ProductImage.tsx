/* eslint-disable @next/next/no-img-element -- foto produk bisa SVG seed, upload lokal, atau Vercel Blob; <img> biasa menghindari konfigurasi remotePatterns. */

type Props = { src: string | null; alt: string; className?: string; eager?: boolean };

/** Foto produk rasio 3:4 dengan latar gelap saat belum ada foto. */
export function ProductImage({ src, alt, className = "", eager }: Props) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden border border-line bg-ink-3 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center font-[family-name:var(--font-jp)] text-5xl text-line-strong">
          虎
        </span>
      )}
    </div>
  );
}
