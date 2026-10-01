import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Booking, BookingSource, BookingStatus, Room, RoomManualStatus } from "../types";
import { getRoomById } from "../data/rooms";
import { isSupabaseConfigured } from "../lib/supabase";
import { sendBookingEmailsOnConfirm } from "../lib/email";
import {
  deleteBookingFromDb,
  fetchBookingsFromDb,
  fetchRoomStatusFromDb,
  insertBookingToDb,
  migrateLocalStorageToDb,
  updateBookingStatusInDb,
  updateRoomStatusInDb,
} from "../lib/db/bookingRepository";

const STORAGE_KEY = "bpi_bookings_v1";
const ROOM_STATUS_KEY = "bpi_room_manual_status_v1";

type RoomStatusById = Partial<Record<Room["id"], RoomManualStatus>>;

function loadRoomStatus(): RoomStatusById {
  try {
    const raw = localStorage.getItem(ROOM_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as RoomStatusById;
  } catch {
    return {};
  }
}

function saveRoomStatus(status: RoomStatusById) {
  if (!isSupabaseConfigured()) {
    localStorage.setItem(ROOM_STATUS_KEY, JSON.stringify(status));
  }
}

function randomTicket() {
  return String(10000 + Math.floor(Math.random() * 90000));
}

function usedTicketSet(bookings: Booking[]) {
  return new Set(bookings.map((b) => b.ticketNumber).filter(Boolean));
}

function generateTicketNumber(existing: Set<string>) {
  let attempts = 0;
  let next = randomTicket();
  while (existing.has(next) && attempts < 200) {
    next = randomTicket();
    attempts += 1;
  }
  existing.add(next);
  return next;
}

function normalizeBooking(raw: unknown): Booking | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const roomId = record.roomId as Room["id"] | undefined;
  if (!roomId) return null;
  const roomName =
    typeof record.roomName === "string" && record.roomName.trim() ? record.roomName : getRoomById(roomId)?.name ?? roomId;
  const paymentMethod =
    record.paymentMethod === "gcash" || record.paymentMethod === "card"
      ? record.paymentMethod
      : record.payment === "gcash" || record.payment === "card"
        ? record.payment
        : "gcash";
  const source: BookingSource =
    record.source === "airbnb" || record.source === "booking_com" || record.source === "manual_occupied"
      ? record.source
      : "website";

  const booking: Booking = {
    id: typeof record.id === "string" && record.id ? record.id : crypto.randomUUID(),
    ticketNumber:
      typeof record.ticketNumber === "string" && /^\d{5}$/.test(record.ticketNumber) ? record.ticketNumber : randomTicket(),
    source,
    fullName: String(record.fullName ?? record.name ?? "").trim(),
    email: String(record.email ?? "").trim(),
    phone: String(record.phone ?? "").trim(),
    checkIn: String(record.checkIn ?? "").trim(),
    checkOut: String(record.checkOut ?? "").trim(),
    roomId,
    roomName,
    type: record.type === "walk-in" || record.type === "manual" ? record.type : "online",
    paymentMethod,
    status:
      record.status === "archived" ? "archived" : record.status === "confirmed" ? "confirmed" : "pending",
    createdAt: typeof record.createdAt === "string" && record.createdAt ? record.createdAt : new Date().toISOString(),
    notes: String(record.notes ?? "").trim(),
  };

  if (!booking.fullName || !booking.checkIn || !booking.checkOut) return null;
  return booking;
}

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeBooking).filter(Boolean) as Booking[];
    const used = new Set<string>();
    return normalized.map((b) => {
      const ticket = /^\d{5}$/.test(b.ticketNumber) && !used.has(b.ticketNumber) ? b.ticketNumber : generateTicketNumber(used);
      used.add(ticket);
      return { ...b, ticketNumber: ticket };
    });
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]) {
  if (!isSupabaseConfigured()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }
}

function newId() {
  return crypto.randomUUID();
}

type CreateDraftInput = Omit<Booking, "id" | "ticketNumber" | "source" | "status" | "createdAt">;

type BookingContextValue = {
  bookings: Booking[];
  isLoading: boolean;
  loadError: string | null;
  syncError: string | null;
  clearSyncError: () => void;
  roomStatusById: RoomStatusById;
  setRoomManualStatus: (roomId: Room["id"], status: RoomManualStatus) => void;
  clearRoomManualStatus: (roomId: Room["id"]) => void;
  addBooking: (
    input: CreateDraftInput & {
      id?: string;
      status?: BookingStatus;
      source?: BookingSource;
      paymentStatus?: "pending" | "paid";
    },
  ) => Booking;
  setBookingStatus: (bookingId: string, status: BookingStatus) => void;
  deleteBooking: (bookingId: string) => void;
  getBooking: (bookingId: string) => Booking | undefined;
  bookingFormDraft: {
    fullName: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    roomId: Room["id"];
  };
  setBookingFormDraft: (draft: Partial<BookingContextValue["bookingFormDraft"]>) => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(() => (isSupabaseConfigured() ? [] : loadBookings()));
  const [roomStatusById, setRoomStatusById] = useState<RoomStatusById>(() => loadRoomStatus());
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [bookingFormDraft, setBookingFormDraftState] = useState<BookingContextValue["bookingFormDraft"]>({
    fullName: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    roomId: "bunk",
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      saveBookings(bookings);
    }
  }, [bookings]);

  useEffect(() => {
    saveRoomStatus(roomStatusById);
  }, [roomStatusById]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    (async () => {
      try {
        const local = loadBookings();
        await migrateLocalStorageToDb(local);
        const [dbBookings, dbRoomStatus] = await Promise.all([fetchBookingsFromDb(), fetchRoomStatusFromDb()]);
        if (cancelled) return;
        setBookings(dbBookings.length > 0 ? dbBookings : local);
        if (Object.keys(dbRoomStatus).length > 0) {
          setRoomStatusById(dbRoomStatus);
        }
      } catch (e) {
        console.error("Supabase load failed, using localStorage fallback", e);
        if (!cancelled) {
          setLoadError("Could not load bookings from Supabase. Showing locally saved data.");
          setBookings(loadBookings());
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!isSupabaseConfigured()) {
        if (e.key === STORAGE_KEY) setBookings(loadBookings());
        if (e.key === ROOM_STATUS_KEY) setRoomStatusById(loadRoomStatus());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<BookingContextValue>(() => {
    return {
      bookings,
      isLoading,
      loadError,
      syncError,
      clearSyncError: () => setSyncError(null),
      roomStatusById,
      setRoomManualStatus(roomId, status) {
        setRoomStatusById((prev) => ({ ...prev, [roomId]: status }));
        if (isSupabaseConfigured()) {
          updateRoomStatusInDb(roomId, status).catch((e) => console.error("Room status sync failed", e));
        }
      },
      clearRoomManualStatus(roomId) {
        setRoomStatusById((prev) => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
        if (isSupabaseConfigured()) {
          updateRoomStatusInDb(roomId, "available").catch((e) => console.error("Room status sync failed", e));
        }
      },
      bookingFormDraft,
      setBookingFormDraft(draft) {
        setBookingFormDraftState((prev) => ({ ...prev, ...draft }));
      },
      addBooking(input) {
        const { id: inputId, paymentStatus, ...rest } = input;
        const existing = usedTicketSet(bookings);
        const booking: Booking = {
          id: inputId ?? newId(),
          ticketNumber: generateTicketNumber(existing),
          source: rest.source ?? "website",
          createdAt: new Date().toISOString(),
          ...rest,
          status: "pending",
        };
        setBookings((prev) => [booking, ...prev]);
        if (isSupabaseConfigured()) {
          insertBookingToDb(booking, { paymentStatus: paymentStatus ?? "pending" }).catch((e) => {
            console.error("Booking sync failed", e);
            setBookings((prev) => prev.filter((b) => b.id !== booking.id));
            setSyncError("Failed to save booking. Please try again.");
          });
        }
        return booking;
      },
      setBookingStatus(bookingId, status) {
        const previous = bookings.find((b) => b.id === bookingId);
        if (!previous) return;

        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));

        const shouldEmail = previous.status === "pending" && status === "confirmed";
        const confirmedBooking = shouldEmail ? { ...previous, status: "confirmed" as const } : null;

        if (isSupabaseConfigured()) {
          updateBookingStatusInDb(bookingId, status)
            .then(() => {
              if (confirmedBooking) {
                sendBookingEmailsOnConfirm(confirmedBooking).catch((e) =>
                  console.error("Confirmation email failed", e),
                );
              }
            })
            .catch((e) => {
              console.error("Status sync failed", e);
              setBookings((prev) =>
                prev.map((b) => (b.id === bookingId ? { ...b, status: previous.status } : b)),
              );
              setSyncError("Failed to update booking status. Change reverted.");
            });
        } else if (confirmedBooking) {
          sendBookingEmailsOnConfirm(confirmedBooking).catch((e) =>
            console.error("Confirmation email failed", e),
          );
        }
      },
      deleteBooking(bookingId) {
        const removed = bookings.find((b) => b.id === bookingId);
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        if (isSupabaseConfigured()) {
          deleteBookingFromDb(bookingId).catch((e) => {
            console.error("Delete sync failed", e);
            if (removed) {
              setBookings((prev) => [removed, ...prev].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
            }
            setSyncError("Failed to delete booking. Change reverted.");
          });
        }
      },
      getBooking(bookingId) {
        return bookings.find((b) => b.id === bookingId);
      },
    };
  }, [bookings, bookingFormDraft, roomStatusById, isLoading, loadError, syncError]);

  return <BookingContext.Provider value={api}>{children}</BookingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within BookingProvider");
  return ctx;
}
