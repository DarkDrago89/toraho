"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btnGhost, btnPrimary, ErrorList, fieldCls } from "@/components/ui/admin";
import { deleteCategoryAction, saveCategoryAction } from "./actions";

type Cat = { id: string; name: string; slug: string; isVisible: boolean; sortOrder: number; products: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [newName, setNewName] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErrors([]);
      const r = await fn();
      if (!r.ok && r.error) setErrors([r.error]);
      router.refresh();
    });

  return (
    <div className="max-w-3xl space-y-6">
      <ErrorList errors={errors} />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          run(async () => {
            const r = await saveCategoryAction({ name: newName, isVisible: true, sortOrder: categories.length });
            if (r.ok) setNewName("");
            return r;
          });
        }}
      >
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama kategori baru, mis. Aksesoris" className={`${fieldCls} min-w-0 flex-1`} />
        <button disabled={pending || !newName.trim()} className={btnPrimary}>
          Tambah
        </button>
      </form>

      <ul className="divide-y divide-line border-y border-line">
        {categories.map((c) => (
          <CategoryRow key={c.id} c={c} pending={pending} run={run} />
        ))}
        {categories.length === 0 && <li className="py-8 text-center text-sm text-muted">Belum ada kategori.</li>}
      </ul>
      <p className="text-xs text-muted">Urutan menentukan posisi di menu toko (angka kecil tampil lebih dulu). Kategori tersembunyi beserta produknya tidak tampil di toko.</p>
    </div>
  );
}

function CategoryRow({ c, pending, run }: { c: Cat; pending: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }) {
  const [name, setName] = useState(c.name);
  const [order, setOrder] = useState(c.sortOrder);
  const dirty = name !== c.name || order !== c.sortOrder;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <input type="number" aria-label="Urutan" value={order} onChange={(e) => setOrder(Number(e.target.value))} className={`${fieldCls} w-16`} />
      <input aria-label="Nama kategori" value={name} onChange={(e) => setName(e.target.value)} className={`${fieldCls} min-w-40 flex-1`} />
      <span className="w-28 text-xs text-muted">
        /{c.slug} · {c.products} produk
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => saveCategoryAction({ id: c.id, name: c.name, sortOrder: c.sortOrder, isVisible: !c.isVisible }))}
        className={btnGhost}
      >
        {c.isVisible ? "Tampil" : "Tersembunyi"}
      </button>
      {dirty && (
        <button type="button" disabled={pending} onClick={() => run(() => saveCategoryAction({ id: c.id, name, sortOrder: order, isVisible: c.isVisible }))} className={btnPrimary}>
          Simpan
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Hapus kategori "${c.name}"?`)) run(() => deleteCategoryAction(c.id));
        }}
        className="text-xs text-muted underline hover:text-paper"
      >
        Hapus
      </button>
    </li>
  );
}
