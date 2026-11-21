"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/admin-auth/actions";

const inputCls = "mt-1.5 w-full border border-line bg-ink-2 px-3 py-3 text-sm focus:border-paper focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block text-xs tracking-[0.15em] text-muted uppercase">
        Email
        <input key={state?.email} name="email" type="email" required autoComplete="username" defaultValue={state?.email} className={inputCls} />
      </label>
      <label className="block text-xs tracking-[0.15em] text-muted uppercase">
        Kata sandi
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full bg-paper py-3.5 text-xs font-bold tracking-[0.25em] text-ink uppercase hover:bg-white disabled:opacity-50">
        {pending ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}
