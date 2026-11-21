import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Tas Belanja" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="eyebrow">Tas belanja</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">Keranjang</h1>
      <CartView />
    </div>
  );
}
