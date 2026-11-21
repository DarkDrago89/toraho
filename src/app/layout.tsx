import type { Metadata } from "next";
import { Archivo, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "700", "800", "900"] });
// Hanya dipakai untuk aksen kanji 虎火, jadi cukup bobot 700.
const notoJp = Noto_Serif_JP({ variable: "--font-noto-jp", weight: ["700"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Toraho 虎火 — Jaket, Kaos & Merch Bernuansa Jepang", template: "%s · Toraho" },
  description: "Toraho (虎 harimau, 火 api): jaket, kaos, dan merchandise bernuansa Jepang. Monokrom, berani, dibuat untuk dipakai.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${archivo.variable} ${notoJp.variable} min-h-dvh`}>{children}</body>
    </html>
  );
}
