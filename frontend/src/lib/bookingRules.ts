import type { Booking, Room } from "../types";
import { countBookedForRoom } from "./availability";
import { parseYmd } from "./dates";

export type BookingConflictResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateBookingDates(checkIn: string, checkOut: string): BookingConflictResult {
  const inD = parseYmd(checkIn);
  const outD = parseYmd(checkOut);
  if (!inD || !outD) return { ok: false, message: "Please select valid dates." };
  if (outD <= inD) return { ok: false, message: "Check-out must be after check-in" };
  return { ok: true };
}

export function validateRoomAvailability(input: {
  room: Room;
  bookings: Booking[];
  checkIn: string;
  checkOut: string;
  manualStatus?: "available" | "occupied";
}): BookingConflictResult {
  const dateOk = validateBookingDates(input.checkIn, input.checkOut);
  if (!dateOk.ok) return dateOk;

  if (input.manualStatus === "occupied") {
    return { ok: false, message: "Room is occupied for selected dates" };
  }

  const booked = countBookedForRoom(input.bookings, input.room.id, input.checkIn, input.checkOut);
  const remaining = Math.max(0, input.room.inventoryCount - booked);
  if (remaining <= 0) return { ok: false, message: "Room is occupied for selected dates" };

  return { ok: true };
}

