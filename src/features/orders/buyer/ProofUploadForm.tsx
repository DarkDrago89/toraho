"use client";

import { useActionState, useState } from "react";
import { IMAGE_ACCEPT, MAX_IMAGE_MB, validateImageUpload } from "@/lib/storage/constants";
import { uploadProofAction } from "../actions";

export function ProofUploadForm({ code, phone }: { code: string; phone: string }) {
  const [state, action, pending] = useActionState(uploadProofAction, null);
  // Cek di browser dulu: file besar/bukan gambar langsung dapat pesan jelas tanpa diunggah.
  const [clientError, setClientError] = useState<string | null>(null);
  const error = clientError ?? (state && !state.ok ? state.error : null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
        const err = file ? validateImageUpload(file) : "Pilih foto bukti transfer dulu";
        setClientError(err);
        if (err) e.preventDefault();
      }}
      className="mt-4 space-y-3"
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="phone" value={phone} />
      <label className="block text-xs tracking-[0.15em] text-muted uppercase">
        Foto bukti transfer (JPG/PNG/WEBP, maks {MAX_IMAGE_MB} MB)
        <input
          type="file"
          name="file"
          accept={IMAGE_ACCEPT}
          required
          onChange={(e) => {
            const f = e.target.files?.[0];
            setClientError(f ? validateImageUpload(f) : null);
          }}
          className="mt-2 block w-full text-sm text-paper file:mr-4 file:border-0 file:bg-paper file:px-4 file:py-2 file:text-xs file:font-bold file:tracking-[0.2em] file:text-ink file:uppercase"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {state?.ok && !clientError && <p role="status" className="text-sm">Bukti terkirim. Admin akan mengecek secepatnya.</p>}
      <button
        disabled={pending || !!clientError}
        className="w-full bg-paper py-3.5 text-xs font-bold tracking-[0.25em] text-ink uppercase hover:bg-white disabled:bg-ink-3 disabled:text-muted"
      >
        {pending ? "Mengunggah…" : "Kirim Bukti Transfer"}
      </button>
    </form>
  );
}
