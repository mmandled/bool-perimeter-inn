import { useState } from "react";
import type { PaymentMethod } from "../types";
import { Modal } from "./Modal";

export function PaymentModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    if (loading) return;
    setSelected(null);
    setError(null);
    setLoading(false);
    onClose();
  }

  async function confirm() {
    setError(null);
    if (!selected) {
      setError("Please select a payment method.");
      return;
    }
    try {
      setLoading(true);
      await onConfirm(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Select Payment Method" maxWidthClassName="max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <Pick
            label="GCash"
            selected={selected === "gcash"}
            onClick={() => !loading && setSelected("gcash")}
          />
          <Pick
            label="Credit Card"
            selected={selected === "card"}
            onClick={() => !loading && setSelected("card")}
          />
        </div>

        {error ? <div className="text-[11px] font-medium text-red-600">{error}</div> : null}
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-700">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600"
              aria-hidden="true"
            />
            Redirecting to PayMongo checkout...
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-full border border-neutral-300 px-5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={loading}
            className="rounded-full bg-brand-600 px-5 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01] disabled:opacity-60"
          >
            {loading ? "Redirecting..." : "Continue to Payment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Pick({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
        selected ? "border-brand-500 bg-brand-50" : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-neutral-900">{label}</div>
        <div className="mt-1 text-[11px] text-neutral-600">Secure PayMongo checkout</div>
      </div>
      <div
        className={`h-5 w-5 rounded-full border-2 ${selected ? "border-brand-600 bg-brand-600" : "border-neutral-300"}`}
        aria-hidden="true"
      />
    </button>
  );
}
