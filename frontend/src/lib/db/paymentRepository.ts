import type { PaymentMethod } from "../../types";
import { getSupabase } from "../supabase";

export type PaymentInsert = {
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymongoPaymentId: string;
  status: "paid" | "pending" | "failed" | "refunded";
};

export async function insertPaymentToDb(payment: PaymentInsert): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from("payments").insert({
    booking_id: payment.bookingId,
    amount: payment.amount,
    payment_method: payment.paymentMethod,
    paymongo_payment_id: payment.paymongoPaymentId,
    status: payment.status,
  });
  if (error) throw error;
}
