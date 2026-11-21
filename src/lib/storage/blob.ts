import { put } from "@vercel/blob";
import type { FileStorage } from "./types";

/** Vercel Blob (produksi). Butuh env BLOB_READ_WRITE_TOKEN. */
export const blobStorage: FileStorage = {
  async put(key, data, contentType) {
    const res = await put(key, data, { access: "public", contentType, addRandomSuffix: true });
    return res.url;
  },
};
