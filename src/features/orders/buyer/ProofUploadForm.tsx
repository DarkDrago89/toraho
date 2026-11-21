"use client";

import { useActionState } from "react";
import { IMAGE_ACCEPT } from "@/lib/storage/constants";
import { uploadProofAction } from "../actions";

export function ProofUploadForm({ code, phone }: { code: string; phone: string }) {
  const [state, action, pending] = useActionState(uploadProofAction, null);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="phone" value={phone} />
      <label className="block text-xs tracking-[0.15em] text-muted uppercase">
        Foto bukti transfer (JPG/PNG/WEBP, maks 5 MB)
        <input
          type="file"
          name="file"
          accept={IMAGE_ACCEPT}
          required
          className="mt-2 block w-full text-sm text-paper file:mr-4 file:border-0 file:bg-paper file:px-4 file:py-2 file:text-xs file:font-bold file:tracking-[0.2em] file:text-ink file:uppercase"
        />
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && <p role="status" className="text-sm">Bukti terkirim. Admin akan mengecek secepatnya.</p>}
      <button
        disabled={pending}
        className="w-full bg-paper py-3.5 text-xs font-bold tracking-[0.25em] text-ink uppercase hover:bg-white disabled:bg-ink-3 disabled:text-muted"
      >
        {pending ? "Mengunggah…" : "Kirim Bukti Transfer"}
      </button>
    </form>
  );
}
