"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DestinationView } from "@/lib/shipping/types";
import { choiceCls, inputCls } from "./ui";

type Props = {
  value: DestinationView | null;
  onChange: (d: DestinationView | null) => void;
  /** Pencarian tidak tersedia (RajaOngkir belum diatur atau sedang bermasalah) → induk beralih ke isian manual. */
  onUnavailable?: () => void;
  label?: string;
  hint?: string;
};

/**
 * Cari tujuan lewat /api/ongkir/tujuan, lalu pilih satu hasil (grup radio) dan konfirmasi dengan
 * "Pakai alamat ini". Konfirmasi terpisah karena tombol panah di grup radio langsung mengganti pilihan:
 * tanpa itu pengguna keyboard hanya bisa memilih hasil pertama/terakhir.
 * Pencarian berjalan saat tombol "Cari" atau Enter ditekan — bukan tiap ketukan — untuk menghemat kuota API.
 */
export function DestinationSearch({
  value,
  onChange,
  onUnavailable,
  label = "Cari kelurahan, kecamatan, atau kode pos",
  hint = "Contoh: Cibubur, Coblong, atau 40132",
}: Props) {
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DestinationView[] | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  // Ke mana fokus dipindah setelah tampilan berganti (ringkasan ↔ pencarian), agar tidak jatuh ke <body>.
  const focusNext = useRef<"input" | "change" | null>(null);

  useEffect(() => {
    if (focusNext.current === "input" && !value) inputRef.current?.focus();
    if (focusNext.current === "change" && value) changeRef.current?.focus();
    focusNext.current = null;
  }, [value]);

  async function search() {
    const query = q.trim();
    if (query.length < 3) {
      setError("Ketik minimal 3 huruf");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ongkir/tujuan?q=${encodeURIComponent(query)}`);
      const body = (await res.json().catch(() => ({}))) as { results?: DestinationView[]; error?: string };
      if (res.status === 404 || res.status === 503) {
        onUnavailable?.();
        return;
      }
      if (!res.ok || !Array.isArray(body.results)) {
        setError(body.error ?? "Pencarian gagal, coba lagi");
        return;
      }
      setResults(body.results);
      setChoice(null);
      setStatus(
        body.results.length
          ? `${body.results.length} alamat ditemukan. Pilih yang sesuai, lalu tekan "Pakai alamat ini".`
          : "Alamat tidak ditemukan. Coba nama kecamatan atau kode pos.",
      );
    } catch {
      setError("Pencarian gagal. Periksa koneksi, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function commit() {
    const picked = results?.find((d) => d.id === choice);
    if (!picked) {
      setError("Pilih salah satu alamat dulu");
      return;
    }
    focusNext.current = "change";
    onChange(picked);
  }

  if (value) {
    return (
      <div className="flex items-start justify-between gap-4 border border-paper p-4">
        <div>
          <p className="text-xs tracking-[0.15em] text-muted uppercase">Dikirim ke</p>
          <p className="mt-1 text-sm">{value.label}</p>
        </div>
        <button
          ref={changeRef}
          type="button"
          onClick={() => {
            focusNext.current = "input";
            setResults(null);
            setChoice(null);
            setStatus("");
            onChange(null);
          }}
          className="shrink-0 text-xs tracking-[0.2em] uppercase underline underline-offset-4 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div>
      <search>
        <label htmlFor={`${id}-q`} className="block text-xs tracking-[0.15em] text-muted uppercase">
          {label}
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id={`${id}-q`}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              // Enter = cari (bukan kirim checkout). Lewati saat IME masih menyusun huruf.
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void search();
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            aria-describedby={`${id}-hint`}
            aria-invalid={error ? true : undefined}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => void search()}
            disabled={loading}
            className="mt-1.5 shrink-0 border border-paper px-5 text-xs font-bold tracking-[0.2em] uppercase transition hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper disabled:opacity-50"
          >
            {loading ? "Mencari…" : "Cari"}
          </button>
        </div>
        <p id={`${id}-hint`} className="mt-1 text-[0.7rem] text-muted">
          {hint}
        </p>
      </search>

      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
      <p aria-live="polite" className={results && results.length === 0 ? "mt-3 text-sm text-muted" : "sr-only"}>
        {status}
      </p>

      {results && results.length > 0 && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs tracking-[0.15em] text-muted uppercase">Pilih alamat yang sesuai</legend>
          <div className="grid gap-2">
            {results.map((d) => (
              <label key={d.id} className={choiceCls}>
                <input
                  type="radio"
                  name={`${id}-tujuan`}
                  value={d.id}
                  checked={choice === d.id}
                  onChange={() => setChoice(d.id)}
                  onKeyDown={(e) => {
                    // Enter di radio = konfirmasi (bukan mengirim form checkout).
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      commit();
                    }
                  }}
                  className="mt-1 accent-white"
                />
                <span className="text-sm">{d.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={commit}
            className="mt-3 w-full border border-paper py-3 text-xs font-bold tracking-[0.2em] uppercase transition hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            Pakai alamat ini
          </button>
        </fieldset>
      )}
    </div>
  );
}
