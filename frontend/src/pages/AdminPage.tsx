import { useEffect, useMemo, useState } from "react";
import { rooms } from "../data/rooms";
import { useBookings } from "../state/bookingStore";
import type { Booking, BookingSource, BookingStatus, Room, RoomManualStatus } from "../types";
import { isAuthorizedAdmin, signInAdmin, signOutAdmin } from "../lib/adminAuth";
import { validateRoomAvailability } from "../lib/bookingRules";
import { parseYmd } from "../lib/dates";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { ReservationCalendar } from "../components/ReservationCalendar";

const STATUS_SORT_ORDER: Record<BookingStatus, number> = {
  pending: 0,
  confirmed: 1,
  archived: 2,
};

function sortByStatusPriority(items: Booking[]) {
  return [...items].sort((a, b) => {
    const byStatus = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function AdminPage() {
  const {
    bookings,
    addBooking,
    setBookingStatus,
    deleteBooking,
    roomStatusById,
    setRoomManualStatus,
    isLoading,
    loadError,
    syncError,
    clearSyncError,
  } = useBookings();
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAuthorized(false);
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    async function applySession(hasSession: boolean) {
      if (!hasSession) {
        if (!cancelled) {
          setAuthorized(false);
          setAuthReady(true);
        }
        return;
      }

      const ok = await isAuthorizedAdmin();
      if (cancelled) return;
      if (!ok) {
        await signOutAdmin();
        setAuthorized(false);
        setErr("This account is not authorized for admin access.");
        setAuthReady(true);
        return;
      }
      setErr(null);
      setAuthorized(true);
      setAuthReady(true);
    }

    sb.auth.getSession().then(({ data }) => applySession(Boolean(data.session)));

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      void applySession(Boolean(session));
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const sorted = useMemo(() => [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [bookings]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (b) =>
        b.fullName.toLowerCase().includes(q) ||
        b.ticketNumber.includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.roomName.toLowerCase().includes(q),
    );
  }, [query, sorted]);
  const websiteBookings = sortByStatusPriority(
    filtered.filter((b) => b.source === "website" || b.type === "walk-in"),
  );
  const airbnbBookings = sortByStatusPriority(filtered.filter((b) => b.source === "airbnb"));
  const bookingComBookings = sortByStatusPriority(filtered.filter((b) => b.source === "booking_com"));

  if (!authReady) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center bg-white">
        <div className="text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-neutral-600">Checking admin session...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="w-full min-h-[100svh] bg-white py-16">
        <div className="mx-auto max-w-[520px] rounded-2xl bg-white px-6 py-8 shadow-soft ring-1 ring-black/5">
          <h1 className="font-heading text-3xl text-neutral-900">Admin Login</h1>

          <form
            className="mt-6 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              const fd = new FormData(e.currentTarget);
              const email = String(fd.get("email") ?? "");
              const password = String(fd.get("password") ?? "");
              if (!isSupabaseConfigured()) {
                setErr("Supabase is not configured.");
                return;
              }
              try {
                setLoginBusy(true);
                await signInAdmin(email, password);
                setAuthorized(true);
              } catch (loginErr) {
                setAuthorized(false);
                setErr(loginErr instanceof Error ? loginErr.message : "Invalid credentials.");
              } finally {
                setLoginBusy(false);
              }
            }}
          >
            <Field label="Email">
              <input
                name="email"
                type="email"
                autoComplete="username"
                aria-label="Admin email"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                aria-label="Admin password"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
            </Field>
            {err ? <div className="text-[11px] font-medium text-red-600">{err}</div> : null}
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full rounded-md bg-brand-600 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loginBusy ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center bg-white">
        <div className="text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-neutral-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100svh] bg-white py-10 sm:py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {loadError ? (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            {loadError}
          </div>
        ) : null}
        {syncError ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800 ring-1 ring-red-200">
            <span>{syncError}</span>
            <button
              type="button"
              onClick={clearSyncError}
              className="shrink-0 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.22em] text-yellow-700/80">ADMIN</div>
            <h1 className="mt-2 font-heading text-3xl text-neutral-900">Bookings</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-neutral-300 px-5 py-2 text-xs font-semibold text-neutral-700"
              onClick={() => {
                void signOutAdmin().then(() => {
                  setAuthorized(false);
                  setErr(null);
                });
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-6 lg:mt-8">
          <ReservationCalendar bookings={bookings} roomStatusById={roomStatusById} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
              <div className="text-xs font-semibold text-neutral-900">Room status</div>
              <div className="mt-4 space-y-3">
                {rooms.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-neutral-900">{r.name}</div>
                      <div className="mt-0.5 text-[10px] text-neutral-500">Manual override: {roomStatusById[r.id] ?? "available"}</div>
                    </div>
                    <select
                      value={roomStatusById[r.id] ?? "available"}
                      onChange={(e) => setRoomManualStatus(r.id, e.target.value as "available" | "occupied")}
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px]"
                    >
                      <option value="available">available</option>
                      <option value="occupied">occupied</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-neutral-500">
                If marked <span className="font-semibold">occupied</span>, the room cannot be booked online or as walk-in.
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
              <div className="text-xs font-semibold text-neutral-900">Add website booking / walk-in</div>
              <ReservationForm
                title="Website"
                showWalkInToggle
                roomStatusById={roomStatusById}
                allowedRoomIds={rooms.filter((r) => r.bookingSource === "website").map((r) => r.id)}
                onAdd={(data) => {
                  const room = rooms.find((r) => r.id === data.roomId);
                  if (!room) return;
                  const res = validateRoomAvailability({
                    room,
                    bookings,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    manualStatus: roomStatusById[room.id],
                  });
                  if (res.ok === false) {
                    throw new Error(res.message);
                  }

                  addBooking({
                    fullName: data.fullName,
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    roomId: data.roomId,
                    roomName: rooms.find((r) => r.id === data.roomId)?.name ?? data.roomId,
                    type: data.isWalkIn ? "walk-in" : "manual",
                    paymentMethod: data.paymentMethod ?? "gcash",
                    source: "website",
                    notes: data.notes ?? "",
                  });
                }}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
              <div className="text-xs font-semibold text-neutral-900">Add Airbnb reservation</div>
              <ReservationForm
                title="Airbnb"
                roomStatusById={roomStatusById}
                allowedRoomIds={rooms.filter((r) => r.bookingSource === "airbnb").map((r) => r.id)}
                onAdd={(data) => {
                  const room = rooms.find((r) => r.id === data.roomId);
                  if (!room) return;
                  const res = validateRoomAvailability({
                    room,
                    bookings,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    manualStatus: roomStatusById[room.id],
                  });
                  if (res.ok === false) throw new Error(res.message);
                  addBooking({
                    fullName: data.fullName,
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    roomId: room.id,
                    roomName: room.name,
                    type: "manual",
                    paymentMethod: "card",
                    source: "airbnb",
                    notes: data.notes ?? "",
                  });
                }}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
              <div className="text-xs font-semibold text-neutral-900">Add Booking.com reservation</div>
              <ReservationForm
                title="Booking.com"
                roomStatusById={roomStatusById}
                allowedRoomIds={rooms.filter((r) => r.bookingSource === "booking_com").map((r) => r.id)}
                onAdd={(data) => {
                  const room = rooms.find((r) => r.id === data.roomId);
                  if (!room) return;
                  const res = validateRoomAvailability({
                    room,
                    bookings,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    manualStatus: roomStatusById[room.id],
                  });
                  if (res.ok === false) throw new Error(res.message);
                  addBooking({
                    fullName: data.fullName,
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    roomId: room.id,
                    roomName: room.name,
                    type: "manual",
                    paymentMethod: "card",
                    source: "booking_com",
                    notes: data.notes ?? "",
                  });
                }}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5 sm:p-5">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-neutral-500">SEARCH</div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ticket, email, phone, or room"
                aria-label="Search bookings by name, ticket, email, phone, or room"
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <BookingTable
              title="Website Bookings"
              bookings={websiteBookings}
              onDelete={deleteBooking}
              onSetStatus={setBookingStatus}
              sourceColor="green"
            />
            <BookingTable
              title="Airbnb Reservations"
              bookings={airbnbBookings}
              onDelete={deleteBooking}
              onSetStatus={setBookingStatus}
              sourceColor="blue"
            />
            <BookingTable
              title="Booking.com Reservations"
              bookings={bookingComBookings}
              onDelete={deleteBooking}
              onSetStatus={setBookingStatus}
              sourceColor="orange"
            />

          </div>
        </div>
      </div>
    </div>
  );
}

function ReservationForm({
  title,
  onAdd,
  roomStatusById,
  allowedRoomIds,
  showWalkInToggle = false,
}: {
  title: string;
  onAdd: (data: {
    fullName: string;
    email?: string;
    phone?: string;
    checkIn: string;
    checkOut: string;
    roomId: "single" | "bunk" | "double";
    paymentMethod?: "gcash" | "card";
    notes?: string;
    isWalkIn?: boolean;
  }) => void;
  roomStatusById: Partial<Record<Room["id"], RoomManualStatus>>;
  allowedRoomIds: Room["id"][];
  showWalkInToggle?: boolean;
}) {
  const firstRoomId = allowedRoomIds[0] ?? "bunk";
  const [form, setForm] = useState<{
    fullName: string;
    email?: string;
    phone?: string;
    checkIn: string;
    checkOut: string;
    roomId: "single" | "bunk" | "double";
    paymentMethod?: "gcash" | "card";
    notes?: string;
    isWalkIn?: boolean;
  }>({
    fullName: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    roomId: firstRoomId,
    paymentMethod: "gcash",
    notes: "",
    isWalkIn: false,
  });
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        try {
          if (!form.fullName.trim()) throw new Error("Full name is required");
          if (!form.checkIn || !form.checkOut) throw new Error("Please select valid dates.");
          const inD = parseYmd(form.checkIn);
          const outD = parseYmd(form.checkOut);
          if (!inD || !outD || outD <= inD) throw new Error("Check-out must be after check-in.");
          onAdd(form);
          setForm({
            fullName: "",
            email: "",
            phone: "",
            checkIn: "",
            checkOut: "",
            roomId: firstRoomId,
            paymentMethod: "gcash",
            notes: "",
            isWalkIn: false,
          });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Failed to add booking.");
        }
      }}
    >
      <Field label="Full Name">
        <input
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
          />
        </Field>
        <Field label="Phone">
          <input
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Check-in">
          <input
            type="date"
            value={form.checkIn}
            onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
          />
        </Field>
        <Field label="Check-out">
          <input
            type="date"
            value={form.checkOut}
            onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
          />
        </Field>
      </div>
      <Field label="Room">
        <select
          value={form.roomId}
          onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value as "single" | "bunk" | "double" }))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
        >
          {rooms
            .filter((r) => allowedRoomIds.includes(r.id))
            .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
            ))}
        </select>
      </Field>
      {showWalkInToggle ? (
        <label className="flex items-center gap-2 text-[11px] text-neutral-700">
          <input
            type="checkbox"
            checked={form.isWalkIn}
            onChange={(e) => setForm((p) => ({ ...p, isWalkIn: e.target.checked }))}
            className="rounded border-neutral-300"
          />
          Walk-in guest (no online payment)
        </label>
      ) : null}
      {title === "Website" ? (
        <Field label="Payment method">
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value as "gcash" | "card" }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
          >
            <option value="gcash">gcash</option>
            <option value="card">card</option>
          </select>
        </Field>
      ) : null}
      <Field label="Notes (optional)">
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
        />
      </Field>

      {roomStatusById[form.roomId] === "occupied" ? (
        <div className="text-[11px] font-medium text-red-600">Room is occupied for selected dates</div>
      ) : null}
      {err ? <div className="text-[11px] font-medium text-red-600">{err}</div> : null}
      <button type="submit" className="w-full rounded-md bg-brand-600 py-2 text-xs font-semibold text-white">
        Add reservation
      </button>
    </form>
  );
}

function BookingTable({
  title,
  bookings,
  onDelete,
  onSetStatus,
  sourceColor,
}: {
  title: string;
  bookings: Booking[];
  onDelete: (id: string) => void;
  onSetStatus: (id: string, status: BookingStatus) => void;
  sourceColor: "green" | "blue" | "orange";
}) {
  const sourceClass =
    sourceColor === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : sourceColor === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-orange-50 text-orange-700 ring-orange-100";

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
      <div className="border-b border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900">{title}</div>
      <div className="overflow-x-auto">
        <div className="max-h-[440px] overflow-y-auto">
          <table className="w-full min-w-[980px] text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-neutral-50 text-[10px] font-semibold text-neutral-600 shadow-[0_1px_0_0_rgb(245,245,245)]">
              <tr>
                <th className="px-4 py-3">Ticket #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={7}>
                    No reservations yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-t border-neutral-100 ${b.status === "archived" ? "bg-neutral-50/80" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-neutral-900">{b.ticketNumber}</td>
                    <td className="px-4 py-3 text-neutral-800">{b.fullName}</td>
                    <td className="px-4 py-3 text-neutral-700">{b.roomName}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {b.checkIn} → {b.checkOut}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${sourceClass}`}>
                        {sourceLabel(b.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.status}
                        onChange={(e) => onSetStatus(b.id, e.target.value as BookingStatus)}
                        aria-label={`Update status for ${b.fullName}`}
                        className="rounded-md border border-neutral-300 px-2 py-1 text-[11px]"
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="archived">archived</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete booking for ${b.fullName} (${b.ticketNumber})?`)) {
                            onDelete(b.id);
                          }
                        }}
                        aria-label={`Delete booking for ${b.fullName}`}
                        className="rounded-full border border-neutral-300 px-3 py-1 text-[10px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function sourceLabel(source: BookingSource) {
  if (source === "website") return "Website";
  if (source === "airbnb") return "Airbnb";
  if (source === "booking_com") return "Booking.com";
  return "Manual";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <div className="mb-1 text-[10px] font-semibold text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

