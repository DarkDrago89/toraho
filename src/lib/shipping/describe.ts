import { provinceName } from "./provinces";

const COURIER_LABEL: Record<string, string> = {
  jne: "JNE",
  jnt: "J&T",
  sicepat: "SiCepat",
  pos: "POS",
  tiki: "TIKI",
  anteraja: "AnterAja",
  ninja: "Ninja",
};

export const courierLabel = (code: string) => COURIER_LABEL[code] ?? code.toUpperCase();

/** Teks pengiriman untuk halaman pesanan: "JNE REG · estimasi 2–3 hari". null = pesanan lama tanpa data kurir. */
export function describeShipping(o: { courierCode: string | null; courierService: string | null; shippingEtd: string | null }): string | null {
  if (!o.courierCode) return null;
  if (o.courierCode === "standar") return "Tarif standar toko";
  const base = `${courierLabel(o.courierCode)} ${o.courierService ?? ""}`.trim();
  return o.shippingEtd ? `${base} · estimasi ${o.shippingEtd}` : base;
}

/** Alamat kirim satu baris, dengan kelurahan jika ada (pesanan mode kurir). */
export function formatAddress(o: {
  addressLine: string;
  subdistrict: string | null;
  district: string;
  city: string;
  provinceCode: string;
  postalCode: string;
}): string {
  return [o.addressLine, o.subdistrict, o.district, o.city, `${provinceName(o.provinceCode)} ${o.postalCode}`.trim()]
    .filter(Boolean)
    .join(", ");
}
