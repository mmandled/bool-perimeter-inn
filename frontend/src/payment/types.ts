export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";

export type PaymentMethodType = "gcash" | "card";

export type PaymentRecord = {
  id: string;
  bookingId: string;
  amountPhp: number;
  paymentMethod: PaymentMethodType;
  paymongoPaymentId?: string;
  status: PaymentStatus;
  createdAt: string;
};

export const PaymentStatusEnum = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const satisfies Record<string, PaymentStatus>;

export const PaymentMethodEnum = {
  GCASH: "gcash",
  CARD: "card",
} as const satisfies Record<string, PaymentMethodType>;
