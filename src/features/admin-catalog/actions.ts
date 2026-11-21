"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { extFor, getStorage, validateImageUpload } from "@/lib/storage";
import { deleteCategory, saveCategory, saveProduct, type CategoryInput, type ProductInput } from "./service";

function refreshShop() {
  revalidatePath("/", "layout");
}

export async function saveCategoryAction(input: CategoryInput) {
  await requireAdmin();
  const r = await saveCategory(input);
  if (r.ok) refreshShop();
  return r.ok ? { ok: true as const } : r;
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  const r = await deleteCategory(id);
  if (r.ok) refreshShop();
  return r;
}

export async function saveProductAction(input: ProductInput) {
  await requireAdmin();
  const r = await saveProduct(input);
  if (r.ok) refreshShop();
  return r;
}

/** Unggah satu foto produk, kembalikan URL-nya untuk disimpan bersama form. */
export async function uploadProductImageAction(form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "File tidak ditemukan" };
  const invalid = validateImageUpload(file);
  if (invalid) return { ok: false, error: invalid.replace("Bukti", "Foto") };
  const url = await (await getStorage()).put(`produk/foto${extFor(file.type)}`, Buffer.from(await file.arrayBuffer()), file.type);
  return { ok: true, url };
}
