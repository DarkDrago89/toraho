import { STATUS_LABEL, type OrderStatus } from "@/lib/domain/order-status";

/** Warna hanya dipakai di admin (spec: monokrom ketat di toko, warna boleh untuk status admin). */
const TONE: Record<OrderStatus, string> = {
  MENUNGGU_BAYAR: "border-line-strong text-muted",
  MENUNGGU_VERIFIKASI: "border-amber-400/60 text-amber-300",
  DIBAYAR: "border-emerald-400/60 text-emerald-300",
  DIKEMAS: "border-sky-400/60 text-sky-300",
  DIKIRIM: "border-indigo-400/60 text-indigo-300",
  SELESAI: "border-paper text-paper",
  BATAL: "border-line text-muted line-through",
  KEDALUWARSA: "border-line text-muted",
  PERLU_TINDAKAN: "border-red-400/70 bg-red-950/40 text-red-300",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block border px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
