// Pesan checkout yang dipakai server DAN browser. File ini sengaja tanpa impor server (Prisma, dll.).

/** Mode kurir aktif dan normal, tetapi yang dikirim isian wilayah manual: pembeli harus memakai pencarian. */
export const USE_SEARCH_ERROR = "Pilih alamat tujuan dari hasil pencarian";

/** Pesan yang berarti daftar ongkir di layar perlu dimuat ulang. */
export const isShippingStale = (message: string) => /ongkir/i.test(message);
