import type { FileStorage } from "./types";

export { IMAGE_ACCEPT, MAX_IMAGE_BYTES, validateImageUpload } from "./constants";

export function extFor(type: string): string {
  return type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
}

/** Vercel Blob jika token ada, selain itu folder lokal (development). */
export async function getStorage(): Promise<FileStorage> {
  if (process.env.BLOB_READ_WRITE_TOKEN) return (await import("./blob")).blobStorage;
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN belum diisi; unggahan tidak bisa disimpan di Vercel.");
  return (await import("./local")).localStorage;
}
