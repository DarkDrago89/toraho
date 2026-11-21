import { handleMidtransNotification, type MidtransNotification } from "@/features/payments/webhook";

/** URL notifikasi Midtrans (Payment Notification URL di dashboard): {situs}/api/midtrans/notification */
export async function POST(req: Request) {
  let body: MidtransNotification;
  try {
    body = (await req.json()) as MidtransNotification;
  } catch {
    return Response.json({ error: "JSON tidak valid" }, { status: 400 });
  }
  if (typeof body?.order_id !== "string") return Response.json({ error: "order_id kosong" }, { status: 400 });

  const r = await handleMidtransNotification(body);
  return Response.json({ outcome: r.outcome }, { status: r.status });
}
