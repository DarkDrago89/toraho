"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { saveSettings, saveShippingRates, type StoreSettings } from "./service";

export async function saveSettingsAction(input: StoreSettings) {
  await requireAdmin();
  const r = await saveSettings(input);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function saveShippingRatesAction(rates: Record<string, number>) {
  await requireAdmin();
  const r = await saveShippingRates(rates);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
