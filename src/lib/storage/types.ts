/** Penyimpanan file (foto produk, bukti transfer). Mengembalikan URL publik file. */
export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
}

export type UploadFile = { name: string; type: string; size: number; bytes: Buffer };
