"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btnGhost, btnPrimary, ErrorList, inputCls } from "@/components/ui/admin";
import type { OrderStatus } from "@/lib/domain/order-status";
import { orderAction } from "./admin-actions";

type Props = {
  order: { id: string; status: OrderStatus; paymentMethod: "MIDTRANS" | "MANUAL"; paidAt: string | null; canRefund: boolean; refunded: boolean; trackingNumber: string | null };
};

const CANCELLABLE: OrderStatus[] = ["MENUNGGU_BAYAR", "MENUNGGU_VERIFIKASI", "DIBAYAR", "DIKEMAS", "PERLU_TINDAKAN"];

/** Tombol aksi admin sesuai status pesanan. Alasan tolak / batal diisi lewat dialog kecil. */
export function OrderActions({ order }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "reject" | "cancel" | "ship">(null);
  const [text, setText] = useState("");

  type Arg = Parameters<typeof orderAction>[1];
  const run = (a: Arg, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await orderAction(order.id, a);
      if (!r.ok) return setError(r.error);
      after?.();
      setDialog(null);
      setText("");
      router.refresh();
    });

  const s = order.status;
  const buttons: React.ReactNode[] = [];
  if (s === "MENUNGGU_VERIFIKASI") {
    buttons.push(
      <button key="ok" disabled={pending} onClick={() => run({ op: "confirm" })} className={`${btnPrimary} w-full`}>
        Konfirmasi Lunas
      </button>,
      <button key="no" disabled={pending} onClick={() => setDialog("reject")} className={`${btnGhost} w-full`}>
        Tolak Bukti
      </button>,
    );
  }
  if (s === "PERLU_TINDAKAN")
    buttons.push(
      <button key="res" disabled={pending} onClick={() => run({ op: "resolve" })} className={`${btnPrimary} w-full`}>
        Selesaikan → Dibayar
      </button>,
    );
  if (s === "DIBAYAR")
    buttons.push(
      <button key="pack" disabled={pending} onClick={() => run({ op: "advance", to: "DIKEMAS" })} className={`${btnPrimary} w-full`}>
        Tandai Dikemas
      </button>,
    );
  if (s === "DIKEMAS")
    buttons.push(
      <button key="ship" disabled={pending} onClick={() => setDialog("ship")} className={`${btnPrimary} w-full`}>
        Kirim + Isi Resi
      </button>,
    );
  if (s === "DIKIRIM")
    buttons.push(
      <button key="done" disabled={pending} onClick={() => run({ op: "advance", to: "SELESAI" })} className={`${btnPrimary} w-full`}>
        Tandai Selesai
      </button>,
    );
  if (s === "BATAL" && order.canRefund)
    buttons.push(
      <button key="ref" disabled={pending} onClick={() => run({ op: "refund" })} className={`${btnGhost} w-full`}>
        Tandai Sudah Refund
      </button>,
    );
  if (CANCELLABLE.includes(s))
    buttons.push(
      <button key="cancel" disabled={pending} onClick={() => setDialog("cancel")} className="w-full py-2 text-xs text-muted underline hover:text-paper">
        Batalkan pesanan
      </button>,
    );

  const dialogCfg = {
    reject: { title: "Tolak bukti transfer", label: "Alasan (dilihat pembeli)", placeholder: "mis. Nominal tidak sesuai / foto buram", cta: "Tolak", act: () => run({ op: "reject", reason: text }) },
    cancel: {
      title: "Batalkan pesanan",
      label: "Catatan (opsional)",
      placeholder: order.paidAt ? "Pesanan sudah lunas: refund dilakukan manual di luar sistem" : "Alasan batal",
      cta: "Batalkan",
      act: () => run({ op: "cancel", note: text }),
    },
    ship: { title: "Kirim pesanan", label: "Nomor resi", placeholder: "mis. JNE1234567890", cta: "Simpan & Kirim", act: () => run({ op: "advance", to: "DIKIRIM", trackingNumber: text }) },
  } as const;

  return (
    <section className="border border-line p-5">
      <h2 className="eyebrow mb-3">Aksi</h2>
      {error && <ErrorList errors={[error]} />}
      {dialog ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            dialogCfg[dialog].act();
          }}
          className="space-y-3"
        >
          <p className="font-semibold">{dialogCfg[dialog].title}</p>
          <label className="block text-xs tracking-[0.15em] text-muted uppercase">
            {dialogCfg[dialog].label}
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={dialogCfg[dialog].placeholder} className={inputCls} />
          </label>
          <div className="flex gap-2">
            <button disabled={pending} className={`${btnPrimary} flex-1`}>
              {pending ? "…" : dialogCfg[dialog].cta}
            </button>
            <button type="button" onClick={() => setDialog(null)} className={btnGhost}>
              Kembali
            </button>
          </div>
        </form>
      ) : buttons.length ? (
        <div className="space-y-2">{buttons}</div>
      ) : (
        <p className="text-sm text-muted">{s === "MENUNGGU_BAYAR" ? "Menunggu pembeli membayar." : "Tidak ada aksi untuk status ini."}</p>
      )}
      {order.refunded && <p className="mt-3 text-xs text-emerald-300">Sudah direfund.</p>}
    </section>
  );
}
