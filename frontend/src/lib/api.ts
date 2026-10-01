import type { PaymentMethod } from "../types";

export type CheckoutResponse = { checkoutUrl: string; sessionId: string };

export type CheckoutInput = {
  bookingId: string;
  amountPhp: number;
  paymentMethod: PaymentMethod;
  booking: {
    fullName: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    roomId: "single" | "bunk" | "double";
  };
};

export type VerifyCheckoutResponse = {
  paid: boolean;
  sessionId: string;
  amountPhp?: number;
};

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResponse> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Checkout failed (${res.status})`);
  }
  return (await res.json()) as CheckoutResponse;
}

export async function verifyCheckoutSession(sessionId: string): Promise<VerifyCheckoutResponse> {
  const res = await fetch("/api/checkout/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Payment verification failed (${res.status})`);
  }
  return (await res.json()) as VerifyCheckoutResponse;
}
