export type PaymentRequest = {
  code: string;
  total: number;
  customerName: string;
  phone: string;
  email?: string | null;
  items: { name: string; price: number; qty: number }[];
  shippingCost: number;
  expiryHours: number;
};

export type PaymentSession = { token: string; redirectUrl: string };

/** Penyedia pembayaran online. Midtrans sekarang; penyedia lain cukup mengimplementasikan ini. */
export interface PaymentProvider {
  createPayment(req: PaymentRequest): Promise<PaymentSession>;
}
