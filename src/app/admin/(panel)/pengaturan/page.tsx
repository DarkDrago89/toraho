import { PageHeader } from "@/components/ui/admin";
import { getSettings, getShippingOrigin, getShippingRates } from "@/features/settings/service";
import { ShippingOriginForm, ShippingRatesForm, StoreSettingsForm } from "@/features/settings/SettingsForms";
import { couriersFromEnv } from "@/lib/shipping/config";
import { PROVINCES } from "@/lib/shipping/provinces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const [settings, rates, origin] = await Promise.all([getSettings(), getShippingRates(), getShippingOrigin()]);
  const midtransOn = !!process.env.MIDTRANS_SERVER_KEY;
  const production = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return (
    <>
      <PageHeader eyebrow="Toko" title="Pengaturan" />
      <div className="grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <StoreSettingsForm initial={settings} />
          <section className="border border-line p-5 text-sm">
            <h2 className="display text-lg">Midtrans</h2>
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd className={midtransOn ? "text-emerald-300" : "text-amber-300"}>{midtransOn ? "● Terhubung" : "● Belum diatur"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Mode</dt>
                <dd>{production ? "Production (uang sungguhan)" : "Sandbox (uji coba)"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Metode</dt>
                <dd>QRIS + Virtual Account</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Diatur lewat environment variable server (MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION). URL notifikasi di dashboard Midtrans:{" "}
              <code className="text-paper">/api/midtrans/notification</code>
            </p>
          </section>
        </div>
        <div className="space-y-6">
          <ShippingOriginForm initial={origin} apiKeySet={!!process.env.RAJAONGKIR_API_KEY?.trim()} couriers={couriersFromEnv()} />
          <ShippingRatesForm provinces={PROVINCES.map((p) => ({ code: p.code, name: p.name }))} initial={rates} />
        </div>
      </div>
    </>
  );
}
