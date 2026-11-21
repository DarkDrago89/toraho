"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import {
  advanceStatus,
  cancelOrder,
  confirmManualPayment,
  markRefunded,
  rejectManualPayment,
  resolveNeedsAction,
  updateAdminNote,
  type AdminResult,
} from "./admin";

type Op =
  | { op: "confirm" }
  | { op: "reject"; reason: string }
  | { op: "cancel"; note?: string }
  | { op: "resolve" }
  | { op: "advance"; to: "DIKEMAS" | "DIKIRIM" | "SELESAI"; trackingNumber?: string }
  | { op: "refund" }
  | { op: "note"; note: string };

export async function orderAction(orderId: string, a: Op): Promise<AdminResult> {
  await requireAdmin();
  let r: AdminResult;
  switch (a.op) {
    case "confirm":
      r = await confirmManualPayment(orderId);
      break;
    case "reject":
      r = await rejectManualPayment(orderId, a.reason);
      break;
    case "cancel":
      r = await cancelOrder(orderId, a.note);
      break;
    case "resolve":
      r = await resolveNeedsAction(orderId);
      break;
    case "advance":
      r = await advanceStatus(orderId, a.to, a.trackingNumber);
      break;
    case "refund":
      r = await markRefunded(orderId);
      break;
    case "note":
      r = await updateAdminNote(orderId, a.note);
      break;
  }
  if (r.ok) {
    revalidatePath(`/admin/pesanan/${orderId}`);
    revalidatePath("/admin/pesanan");
    revalidatePath("/", "layout");
  }
  return r;
}
