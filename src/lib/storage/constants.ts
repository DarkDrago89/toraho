// Aman diimpor dari komponen client (tanpa modul Node).
// 4 MB: Vercel menolak body request > 4,5 MB, jadi batas ini yang benar-benar bisa sampai ke server.
export const MAX_IMAGE_MB = 4;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

/** null = valid; selain itu pesan error untuk pengguna. Dipakai di browser (sebelum unggah) dan di server. */
export function validateImageUpload(file: { size: number; type: string }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Bukti harus berupa gambar JPG, PNG, atau WEBP";
  if (file.size <= 0) return "File kosong";
  if (file.size > MAX_IMAGE_BYTES) return `Ukuran maksimal ${MAX_IMAGE_MB} MB`;
  return null;
}
