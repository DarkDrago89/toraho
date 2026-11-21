"use client";

/* eslint-disable @next/next/no-img-element -- pratinjau foto dari upload/seed */
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { btnGhost, btnPrimary, ErrorList, fieldCls, inputCls, Label } from "@/components/ui/admin";
import { IMAGE_ACCEPT, validateImageUpload } from "@/lib/storage/constants";
import { saveProductAction, uploadProductImageAction } from "./actions";

/** baseStock = stok saat form dibuka (cek bentrok saat simpan); held = unit yang sedang ditahan pesanan (info saja). */
type VariantRow = { id?: string; label: string; sku: string; stock: number; baseStock?: number; held?: number };
export type ProductFormValue = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  weightGrams: number;
  isVisible: boolean;
  isFeatured: boolean;
  variants: VariantRow[];
  imageUrls: string[];
};

const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"];
const skuBase = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "SKU";

export function ProductForm({ categories, initial }: { categories: { id: string; name: string }[]; initial?: ProductFormValue }) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValue>(
    initial ?? {
      categoryId: categories[0]?.id ?? "",
      name: "",
      description: "",
      price: 0,
      compareAtPrice: null,
      weightGrams: 250,
      isVisible: true,
      isFeatured: false,
      variants: [],
      imageUrls: [],
    },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    set("variants", v.variants.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  function fillApparel() {
    const existing = new Set(v.variants.map((x) => x.label.toUpperCase()));
    const base = skuBase(v.name);
    set("variants", [
      ...v.variants,
      ...APPAREL_SIZES.filter((s) => !existing.has(s)).map((s) => ({ label: s, sku: `${base}-${s}`, stock: 0 })),
    ]);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setErrors([]);
    const urls: string[] = [];
    const errs: string[] = [];
    for (const f of Array.from(files)) {
      const invalid = validateImageUpload(f);
      if (invalid) {
        errs.push(`${f.name}: ${invalid.replace("Bukti", "Foto")}`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", f);
      const r = await uploadProductImageAction(fd);
      if (r.ok) urls.push(r.url);
      else errs.push(`${f.name}: ${r.error}`);
    }
    setV((p) => ({ ...p, imageUrls: [...p.imageUrls, ...urls] }));
    setErrors(errs);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function moveImage(i: number, d: -1 | 1) {
    const arr = [...v.imageUrls];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("imageUrls", arr);
  }

  function save() {
    startSave(async () => {
      setErrors([]);
      const r = await saveProductAction(v);
      if (!r.ok) {
        setErrors(r.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/admin/produk");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_320px]"
    >
      <div className="space-y-6">
        <ErrorList errors={errors} />

        <section className="space-y-4 border border-line p-5">
          <Label text="Nama produk">
            <input required value={v.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Label>
          <Label text="Kategori">
            <select value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Label>
          <Label text="Deskripsi">
            <textarea rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
          </Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Label text="Harga (Rp)">
              <input type="number" min={1} required value={v.price || ""} onChange={(e) => set("price", Number(e.target.value))} className={inputCls} />
            </Label>
            <Label text="Harga coret (opsional)" hint="Harga sebelum diskon">
              <input
                type="number"
                min={1}
                value={v.compareAtPrice ?? ""}
                onChange={(e) => set("compareAtPrice", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Label>
            <Label text="Berat (gram)" hint="Untuk ongkir">
              <input type="number" min={1} required value={v.weightGrams || ""} onChange={(e) => set("weightGrams", Number(e.target.value))} className={inputCls} />
            </Label>
          </div>
        </section>

        <section className="border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="display text-lg">Ukuran & Stok</h2>
            <div className="flex gap-2">
              <button type="button" onClick={fillApparel} className={btnGhost}>
                Ukuran pakaian S–XXL
              </button>
              <button
                type="button"
                onClick={() => set("variants", [...v.variants, { label: v.variants.length ? "" : "All size", sku: `${skuBase(v.name)}-${v.variants.length + 1}`, stock: 0 }])}
                className={btnGhost}
              >
                + Varian
              </button>
            </div>
          </div>
          {v.variants.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Belum ada varian. Untuk merch tanpa ukuran, tambahkan satu varian &quot;All size&quot;.</p>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-[1fr_1.4fr_90px_32px] gap-2 text-[0.65rem] tracking-[0.2em] text-muted uppercase">
                <span>Ukuran</span>
                <span>SKU</span>
                <span title="Stok yang masih bisa dijual (unit yang ditahan pesanan belum lunas sudah dikurangi)">Stok jual</span>
                <span />
              </div>
              {v.variants.map((row, i) => (
                <div key={row.id ?? `new-${i}`} className="grid grid-cols-[1fr_1.4fr_90px_32px] items-center gap-2 [&>p]:col-span-4">
                  <input aria-label="Ukuran" value={row.label} onChange={(e) => setVariant(i, { label: e.target.value })} className={`${fieldCls} w-full min-w-0`} />
                  <input aria-label="SKU" value={row.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} className={`${fieldCls} w-full min-w-0 font-mono text-xs`} />
                  <input
                    aria-label="Stok"
                    type="number"
                    min={0}
                    value={row.stock}
                    onChange={(e) => setVariant(i, { stock: Math.max(0, Number(e.target.value)) })}
                    className={`${fieldCls} w-full min-w-0 tabular-nums`}
                  />
                  <button type="button" aria-label="Hapus varian" onClick={() => set("variants", v.variants.filter((_, j) => j !== i))} className="text-muted hover:text-paper">
                    ✕
                  </button>
                  {!!row.held && (
                    <p className="-mt-1 text-[0.7rem] text-amber-300">
                      + {row.held} ditahan pesanan belum lunas (stok fisik = {row.stock + row.held})
                    </p>
                  )}
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">
                Total stok jual: {v.variants.reduce((n, r) => n + (r.stock || 0), 0)}. Isi dengan stok yang masih bisa dijual, bukan jumlah di rak.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="border border-line p-5">
          <h2 className="display text-lg">Foto</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {v.imageUrls.map((url, i) => (
              <div key={url + i} className="group relative aspect-[3/4] overflow-hidden border border-line bg-ink-3">
                <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 bg-paper px-1 text-[0.55rem] font-bold text-ink">UTAMA</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/80 text-xs opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button type="button" aria-label="Geser kiri" onClick={() => moveImage(i, -1)} className="px-2 py-1">←</button>
                  <button type="button" aria-label="Hapus foto" onClick={() => set("imageUrls", v.imageUrls.filter((_, j) => j !== i))} className="px-2 py-1">✕</button>
                  <button type="button" aria-label="Geser kanan" onClick={() => moveImage(i, 1)} className="px-2 py-1">→</button>
                </div>
              </div>
            ))}
            <label className="grid aspect-[3/4] cursor-pointer place-items-center border border-dashed border-line-strong text-center text-xs text-muted hover:border-paper hover:text-paper">
              {uploading ? "Mengunggah…" : "+ Foto"}
              <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} multiple className="sr-only" disabled={uploading} onChange={(e) => onFiles(e.target.files)} />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">JPG/PNG/WEBP maks 4 MB. Foto pertama jadi foto utama.</p>
        </section>

        <section className="space-y-3 border border-line p-5 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={v.isVisible} onChange={(e) => set("isVisible", e.target.checked)} className="h-4 w-4 accent-white" />
            Tampilkan di toko
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 accent-white" />
            Produk unggulan (beranda)
          </label>
        </section>

        <div className="flex gap-2">
          <button disabled={saving || uploading} className={`${btnPrimary} flex-1 py-3.5`}>
            {saving ? "Menyimpan…" : "Simpan Produk"}
          </button>
          <button type="button" onClick={() => router.back()} className={btnGhost}>
            Batal
          </button>
        </div>
      </div>
    </form>
  );
}
