import type { Metadata } from "next";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = { title: "Lacak Pesanan" };

type Props = { searchParams: Promise<{ kode?: string }> };

export default async function TrackPage({ searchParams }: Props) {
  const { kode } = await searchParams;
  // Dari halaman Akun: kode sudah terisi, pembeli cukup memasukkan nomor HP.
  const defaultCode = typeof kode === "string" ? kode.slice(0, 40) : "";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="eyebrow">Lacak</p>
      <h1 className="display mt-2 text-4xl">Cek Pesanan</h1>
      <p className="mt-3 text-sm text-muted">Masukkan kode pesanan (mis. TRH-261121-7KQ4) dan nomor HP yang dipakai saat checkout.</p>
      <TrackForm key={defaultCode} defaultCode={defaultCode} />
    </div>
  );
}
