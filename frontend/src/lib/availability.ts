import type { Booking, Room } from "../types";
import { parseYmd, rangesOverlap, todayYmd } from "./dates";

function blocksAvailability(b: Booking) {
  return b.status === "pending" || b.status === "confirmed";
}

export function countBookedForRoom(bookings: Booking[], roomId: Room["id"], checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  return bookings.filter((b) => {
    if (b.roomId !== roomId) return false;
    if (!blocksAvailability(b)) return false;
    return rangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut);
  }).length;
}

export function getAvailabilityStatus(
  room: Room,
  bookings: Booking[],
  checkIn: string,
  checkOut: string,
  manualStatus?: "available" | "occupied",
): { isAvailable: boolean; remaining: number; booked: number } {
  if (manualStatus === "occupied") {
    return { isAvailable: false, remaining: 0, booked: room.inventoryCount };
  }
  const booked = countBookedForRoom(bookings, room.id, checkIn, checkOut);
  const remaining = Math.max(0, room.inventoryCount - booked);
  return { isAvailable: remaining > 0, remaining, booked };
}

export function isRoomOccupiedNow(room: Room, bookings: Booking[], manualStatus?: "available" | "occupied") {
  if (manualStatus === "occupied") return true;
  const now = parseYmd(todayYmd());
  if (!now) return false;
  return bookings.some((b) => {
    if (b.roomId !== room.id) return false;
    if (!blocksAvailability(b)) return false;
    const s = parseYmd(b.checkIn);
    const e = parseYmd(b.checkOut);
    if (!s || !e) return false;
    return now >= s && now < e;
  });
}

