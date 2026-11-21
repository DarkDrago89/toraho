import type { FileStorage } from "./types";

import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";

export { IMAGE_ACCEPT, MAX_IMAGE_BYTES } from "./constants";

/** null = valid; selain itu pesan error untuk pengguna. */
export function validateImageUpload(file: { size: number; type: string }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Bukti harus berupa gambar JPG, PNG, atau WEBP";
  if (file.size <= 0) return "File kosong";
  if (file.size > MAX_IMAGE_BYTES) return "Ukuran maksimal 5 MB";
  return null;
}

export function extFor(type: string): string {
  return type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
}

/** Vercel Blob jika token ada, selain itu folder lokal (development). */
export async function getStorage(): Promise<FileStorage> {
  if (process.env.BLOB_READ_WRITE_TOKEN) return (await import("./blob")).blobStorage;
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN belum diisi; unggahan tidak bisa disimpan di Vercel.");
  return (await import("./local")).localStorage;
}
