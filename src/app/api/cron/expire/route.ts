import { expireStaleOrders } from "@/features/orders/service";

export const dynamic = "force-dynamic";

/** Dipanggil Vercel Cron tiap jam (lihat vercel.json). Vercel mengirim header Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const expired = await expireStaleOrders();
  return Response.json({ expired });
}
