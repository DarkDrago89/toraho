import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { FileStorage } from "./types";

/** Khusus development: menulis ke public/uploads agar bisa langsung dibuka di browser. */
export const localStorage: FileStorage = {
  async put(key, data) {
    const safe = key.replace(/[^a-zA-Z0-9/._-]/g, "_");
    const ext = path.extname(safe);
    const name = `${safe.slice(0, safe.length - ext.length)}-${randomBytes(4).toString("hex")}${ext}`;
    const full = path.join(process.cwd(), "public", "uploads", name);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return `/uploads/${name}`;
  },
};
