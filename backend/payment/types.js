const PaymentStatusEnum = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
};

const PaymentMethodEnum = {
  GCASH: "gcash",
  CARD: "card",
};

module.exports = {
  PaymentStatusEnum,
  PaymentMethodEnum,
};
