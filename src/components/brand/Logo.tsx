import Image from "next/image";

type Props = { variant?: "full" | "mark"; className?: string; priority?: boolean };

/** Logo Toraho versi putih untuk latar gelap. Gunakan "mark" di header, "full" di hero. */
export function Logo({ variant = "mark", className, priority }: Props) {
  if (variant === "full") {
    return (
      <Image
        src="/brand/logo-white.png"
        alt="Toraho"
        width={1200}
        height={1113}
        priority={priority}
        className={className}
      />
    );
  }
  return <Image src="/brand/mark-white.png" alt="" width={512} height={512} priority={priority} className={className} />;
}

/** Mark + teks TORAHO untuk header. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo variant="mark" className="h-9 w-9" priority />
      <span className="display text-xl tracking-[0.08em]">Toraho</span>
    </span>
  );
}
