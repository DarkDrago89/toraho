import { STATUS_LABEL, type OrderStatus } from "@/lib/domain/order-status";

const FLOW: OrderStatus[] = ["MENUNGGU_BAYAR", "DIBAYAR", "DIKEMAS", "DIKIRIM", "SELESAI"];

/** Langkah pesanan bergaya monokrom. Status di luar alur normal ditampilkan sebagai satu banner. */
export function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === "BATAL" || status === "KEDALUWARSA" || status === "PERLU_TINDAKAN") {
    const text =
      status === "PERLU_TINDAKAN"
        ? "Pembayaranmu sedang ditinjau admin. Kami akan menghubungimu lewat WhatsApp."
        : status === "BATAL"
          ? "Pesanan ini dibatalkan."
          : "Batas waktu pembayaran sudah lewat. Pesanan dibatalkan otomatis.";
    return (
      <div className="border border-paper p-4">
        <p className="display text-lg">{STATUS_LABEL[status]}</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    );
  }

  const idx = status === "MENUNGGU_VERIFIKASI" ? 0 : FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Status pesanan">
      {FLOW.map((s, i) => {
        const label = i === 0 && status === "MENUNGGU_VERIFIKASI" ? "Dicek admin" : i === 0 ? "Bayar" : STATUS_LABEL[s];
        const done = i < idx;
        const now = i === idx;
        return (
          <li key={s} aria-current={now ? "step" : undefined} className="min-w-0">
            <div className={`h-1 ${done || now ? "bg-paper" : "bg-line"}`} />
            <p className={`mt-2 truncate text-[0.65rem] tracking-[0.15em] uppercase sm:text-xs ${now ? "font-bold text-paper" : done ? "text-paper/70" : "text-muted"}`}>
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
