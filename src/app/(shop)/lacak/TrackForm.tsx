"use client";

import { useActionState } from "react";
import { trackAction } from "@/features/orders/actions";

const inputCls =
  "mt-1.5 w-full border border-line bg-ink-2 px-3 py-3 text-base focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

export function TrackForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, action, pending] = useActionState(trackAction, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block text-xs tracking-[0.15em] text-muted uppercase">
        Kode pesanan
        <input
          name="code"
          required
          defaultValue={defaultCode}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="TRH-…"
          className={`${inputCls} uppercase`}
        />
      </label>
      <label className="block text-xs tracking-[0.15em] text-muted uppercase">
        No. HP / WhatsApp
        <input name="phone" type="tel" required autoComplete="tel" autoFocus={!!defaultCode} placeholder="08…" className={inputCls} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full bg-paper py-4 text-xs font-bold tracking-[0.25em] text-ink uppercase hover:bg-white disabled:opacity-50">
        {pending ? "Mencari…" : "Lacak"}
      </button>
    </form>
  );
}
