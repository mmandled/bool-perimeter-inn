import { rooms, getRoomById } from "../../data/rooms";
import type { Booking, BookingSource, BookingStatus, BookingType, PaymentMethod, Room, RoomManualStatus } from "../../types";
import { getSupabase, isSupabaseConfigured } from "../supabase";

type DbBookingRow = {
  id: string;
  ticket_number: string;
  guest_name: string;
  email: string;
  phone: string;
  room_id: Room["id"];
  check_in: string;
  check_out: string;
  source: BookingSource;
  payment_status: string;
  booking_status: BookingStatus;
  booking_type: BookingType;
  payment_method: PaymentMethod;
  notes: string;
  created_at: string;
};

type DbWalkinRow = {
  id: string;
  guest_name: string;
  phone: string;
  room_id: Room["id"];
  check_in: string;
  check_out: string;
  status: BookingStatus;
  booking_id: string | null;
  created_at: string;
};

type DbRoomRow = {
  id: Room["id"];
  name: string;
  quantity: number;
  status: RoomManualStatus;
};

function rowToBooking(row: DbBookingRow): Booking {
  const roomName = getRoomById(row.room_id)?.name ?? row.room_id;
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    source: row.source,
    fullName: row.guest_name,
    email: row.email,
    phone: row.phone,
    checkIn: row.check_in,
    checkOut: row.check_out,
    roomId: row.room_id,
    roomName,
    type: row.booking_type,
    paymentMethod: row.payment_method,
    status:
      row.booking_status === "archived"
        ? "archived"
        : row.booking_status === "confirmed"
          ? "confirmed"
          : "pending",
    createdAt: row.created_at,
    notes: row.notes ?? "",
  };
}

function walkinToBooking(row: DbWalkinRow): Booking | null {
  if (row.booking_id) return null;
  const roomName = getRoomById(row.room_id)?.name ?? row.room_id;
  return {
    id: row.id,
    ticketNumber: `W${row.id.slice(0, 5).replace(/-/g, "").toUpperCase()}`,
    source: "website",
    fullName: row.guest_name,
    email: "",
    phone: row.phone,
    checkIn: row.check_in,
    checkOut: row.check_out,
    roomId: row.room_id,
    roomName,
    type: "walk-in",
    paymentMethod: "gcash",
    status:
      row.status === "archived" ? "archived" : row.status === "confirmed" ? "confirmed" : "pending",
    createdAt: row.created_at,
    notes: "",
  };
}

export async function fetchBookingsFromDb(): Promise<Booking[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const [{ data: bookingRows, error: bookingErr }, { data: walkinRows, error: walkinErr }] = await Promise.all([
    sb.from("bookings").select("*").order("created_at", { ascending: false }),
    sb.from("walkins").select("*").order("created_at", { ascending: false }),
  ]);

  if (bookingErr) throw bookingErr;
  if (walkinErr) throw walkinErr;

  const fromBookings = (bookingRows as DbBookingRow[] | null)?.map(rowToBooking) ?? [];
  const orphanWalkins =
    (walkinRows as DbWalkinRow[] | null)?.map(walkinToBooking).filter((b): b is Booking => Boolean(b)) ?? [];

  const seen = new Set(fromBookings.map((b) => b.id));
  const merged = [...fromBookings];
  for (const w of orphanWalkins) {
    if (!seen.has(w.id)) merged.push(w);
  }
  return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchRoomStatusFromDb(): Promise<Partial<Record<Room["id"], RoomManualStatus>>> {
  const sb = getSupabase();
  if (!sb) return {};

  const { data, error } = await sb.from("rooms").select("id, status");
  if (error) throw error;

  const out: Partial<Record<Room["id"], RoomManualStatus>> = {};
  for (const row of (data as Pick<DbRoomRow, "id" | "status">[] | null) ?? []) {
    if (row.status === "occupied") out[row.id] = "occupied";
  }
  return out;
}

export async function insertBookingToDb(
  booking: Booking,
  options?: { paymentStatus?: "pending" | "paid" | "failed" | "refunded" },
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const paymentStatus =
    options?.paymentStatus ?? (booking.status === "confirmed" ? "paid" : "pending");

  const { error } = await sb.from("bookings").insert({
    id: booking.id,
    ticket_number: booking.ticketNumber,
    guest_name: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    room_id: booking.roomId,
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    source: booking.source,
    payment_status: paymentStatus,
    booking_status: booking.status,
    booking_type: booking.type,
    payment_method: booking.paymentMethod,
    notes: booking.notes,
    created_at: booking.createdAt,
  });
  if (error) throw error;

  if (booking.type === "walk-in") {
    const { error: walkinErr } = await sb.from("walkins").insert({
      id: crypto.randomUUID(),
      guest_name: booking.fullName,
      phone: booking.phone,
      room_id: booking.roomId,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      status: booking.status,
      booking_id: booking.id,
    });
    if (walkinErr) throw walkinErr;
  }
}

export async function updateBookingStatusInDb(bookingId: string, status: BookingStatus): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("bookings").update({ booking_status: status }).eq("id", bookingId);
  if (error) throw error;

  const walkinStatus = status === "archived" ? "cancelled" : status;
  await sb.from("walkins").update({ status: walkinStatus }).eq("booking_id", bookingId);
}

export async function deleteBookingFromDb(bookingId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("walkins").delete().eq("booking_id", bookingId);
  const { error } = await sb.from("bookings").delete().eq("id", bookingId);
  if (error) throw error;
}

export async function updateRoomStatusInDb(roomId: Room["id"], status: RoomManualStatus): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("rooms").update({ status }).eq("id", roomId);
  if (error) throw error;
}

export async function seedRoomsIfEmpty(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { count, error: countErr } = await sb.from("rooms").select("*", { count: "exact", head: true });
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return;

  const rows = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    quantity: r.inventoryCount,
    status: "available" as const,
  }));
  const { error } = await sb.from("rooms").insert(rows);
  if (error) throw error;
}

export async function migrateLocalStorageToDb(localBookings: Booking[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const flag = "bpi_supabase_migrated_v1";
  if (localStorage.getItem(flag) === "1") return;

  await seedRoomsIfEmpty();
  const existing = await fetchBookingsFromDb();
  const existingTickets = new Set(existing.map((b) => b.ticketNumber));

  for (const b of localBookings) {
    if (existingTickets.has(b.ticketNumber)) continue;
    try {
      await insertBookingToDb(b);
    } catch (e) {
      console.error("Migration insert failed for booking", b.id, e);
    }
  }

  localStorage.setItem(flag, "1");
}
