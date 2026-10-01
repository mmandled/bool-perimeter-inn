import type { PaymentMethod, Room } from "../types";

const STORAGE_KEY = "bpi_pending_checkout_v1";

export type PendingCheckout = {
  bookingId: string;
  sessionId?: string;
  fullName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  roomId: Room["id"];
  roomName: string;
  paymentMethod: PaymentMethod;
  amountPhp: number;
};

export function savePendingCheckout(data: PendingCheckout) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updatePendingCheckoutSessionId(sessionId: string) {
  const current = loadPendingCheckout();
  if (!current) return;
  savePendingCheckout({ ...current, sessionId });
}

export function loadPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCheckout;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  sessionStorage.removeItem(STORAGE_KEY);
}
