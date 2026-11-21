/** 38 provinsi Indonesia. Kode singkat dipakai sebagai kunci tarif ongkir. */
export const PROVINCES = [
  { code: "AC", name: "Aceh" },
  { code: "SU", name: "Sumatera Utara" },
  { code: "SB", name: "Sumatera Barat" },
  { code: "RI", name: "Riau" },
  { code: "KR", name: "Kepulauan Riau" },
  { code: "JA", name: "Jambi" },
  { code: "BE", name: "Bengkulu" },
  { code: "SS", name: "Sumatera Selatan" },
  { code: "BB", name: "Kepulauan Bangka Belitung" },
  { code: "LA", name: "Lampung" },
  { code: "BT", name: "Banten" },
  { code: "JK", name: "DKI Jakarta" },
  { code: "JB", name: "Jawa Barat" },
  { code: "JT", name: "Jawa Tengah" },
  { code: "YO", name: "DI Yogyakarta" },
  { code: "JI", name: "Jawa Timur" },
  { code: "BA", name: "Bali" },
  { code: "NB", name: "Nusa Tenggara Barat" },
  { code: "NT", name: "Nusa Tenggara Timur" },
  { code: "KB", name: "Kalimantan Barat" },
  { code: "KT", name: "Kalimantan Tengah" },
  { code: "KS", name: "Kalimantan Selatan" },
  { code: "KI", name: "Kalimantan Timur" },
  { code: "KU", name: "Kalimantan Utara" },
  { code: "SA", name: "Sulawesi Utara" },
  { code: "GO", name: "Gorontalo" },
  { code: "ST", name: "Sulawesi Tengah" },
  { code: "SR", name: "Sulawesi Barat" },
  { code: "SN", name: "Sulawesi Selatan" },
  { code: "SG", name: "Sulawesi Tenggara" },
  { code: "MA", name: "Maluku" },
  { code: "MU", name: "Maluku Utara" },
  { code: "PA", name: "Papua" },
  { code: "PB", name: "Papua Barat" },
  { code: "PD", name: "Papua Barat Daya" },
  { code: "PT", name: "Papua Tengah" },
  { code: "PP", name: "Papua Pegunungan" },
  { code: "PS", name: "Papua Selatan" },
] as const satisfies readonly { code: string; name: string }[];

export type ProvinceCode = (typeof PROVINCES)[number]["code"];

/** Provinsi di Pulau Jawa, untuk tombol "isi semua provinsi Jawa" di admin. */
export const JAVA_PROVINCES: ProvinceCode[] = ["BT", "JK", "JB", "JT", "YO", "JI"];

export function provinceName(code: string): string {
  return PROVINCES.find((p) => p.code === code)?.name ?? code;
}

export function isProvinceCode(code: string): code is ProvinceCode {
  return PROVINCES.some((p) => p.code === code);
}
