import { useMemo } from "react";
import { rooms } from "../data/rooms";
import type { Booking, BookingSource, Room, RoomManualStatus } from "../types";
import { parseYmd, todayYmd } from "../lib/dates";

const DAY_COUNT = 14;
const COL_WIDTH = 56;
const BAR_HEIGHT = 22;
const BAR_GAP = 3;
const ROW_PADDING = 8;

type Props = {
  bookings: Booking[];
  roomStatusById: Partial<Record<Room["id"], RoomManualStatus>>;
};

type BarPos = { left: number; width: number };
type BarLayout = BarPos & { lane: number };

function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sourceBarClass(source: BookingSource) {
  if (source === "website") return "bg-emerald-500/85 text-white";
  if (source === "airbnb") return "bg-blue-500/85 text-white";
  if (source === "booking_com") return "bg-orange-500/85 text-white";
  return "bg-neutral-500/85 text-white";
}

function sourceLabel(source: BookingSource) {
  if (source === "website") return "Website";
  if (source === "airbnb") return "Airbnb";
  if (source === "booking_com") return "Booking.com";
  return "Manual";
}

function dayIndex(dates: Date[], ymd: string) {
  return dates.findIndex((d) => toYmd(d) === ymd);
}

/** Checkout day is exclusive — guest occupies nights from check-in up to (not including) check-out. */
function barPosition(dates: Date[], checkIn: string, checkOut: string): BarPos | null {
  const inD = parseYmd(checkIn);
  const outD = parseYmd(checkOut);
  if (!inD || !outD) return null;

  const windowStart = dates[0];
  const windowEnd = dates[dates.length - 1];
  if (!windowStart || !windowEnd) return null;

  const windowStartYmd = toYmd(windowStart);
  const windowEndYmd = toYmd(windowEnd);

  if (checkOut <= windowStartYmd || checkIn > windowEndYmd) return null;

  let startIdx = dayIndex(dates, checkIn);
  if (startIdx < 0) startIdx = checkIn < windowStartYmd ? 0 : -1;
  if (startIdx < 0) return null;

  let endIdx = dayIndex(dates, checkOut);
  if (endIdx < 0) {
    endIdx = checkOut > windowEndYmd ? DAY_COUNT : startIdx + 1;
  }

  const span = Math.max(1, endIdx - startIdx);
  const left = startIdx * COL_WIDTH + BAR_GAP;
  const width = span * COL_WIDTH - BAR_GAP * 2;

  return { left, width };
}

function barsOverlap(a: BarPos, b: BarPos) {
  return a.left < b.left + b.width && b.left < a.left + a.width;
}

function assignBarLanes(bookings: Booking[], dates: Date[]): Map<string, BarLayout> {
  const layouts = new Map<string, BarLayout>();
  const sorted = [...bookings].sort(
    (a, b) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt),
  );

  for (const booking of sorted) {
    const pos = barPosition(dates, booking.checkIn, booking.checkOut);
    if (!pos) continue;

    let lane = 0;
    while (
      [...layouts.values()].some((layout) => layout.lane === lane && barsOverlap(pos, layout))
    ) {
      lane += 1;
    }

    layouts.set(booking.id, { ...pos, lane });
  }

  return layouts;
}

function isActiveReservation(booking: Booking) {
  return booking.status === "pending" || booking.status === "confirmed";
}

export function ReservationCalendar({ bookings, roomStatusById }: Props) {
  const dates = useMemo(() => {
    const today = parseYmd(todayYmd()) ?? new Date();
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const activeBookings = useMemo(() => bookings.filter(isActiveReservation), [bookings]);
  const gridWidth = DAY_COUNT * COL_WIDTH;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
      <div className="border-b border-neutral-100 px-4 py-3 sm:px-5">
        <div className="text-sm font-semibold text-neutral-900">Reservation Calendar</div>
        <div className="mt-0.5 text-[11px] text-neutral-500">
          Next {DAY_COUNT} days — active reservations only (pending & confirmed)
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 180 + gridWidth }}>
          <div className="flex border-b border-neutral-100 bg-neutral-50 text-[10px] font-semibold text-neutral-600">
            <div className="w-[180px] shrink-0 px-3 py-2">Room</div>
            <div className="flex" style={{ width: gridWidth }}>
              {dates.map((d) => (
                <div key={toYmd(d)} className="shrink-0 text-center" style={{ width: COL_WIDTH }}>
                  <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="text-neutral-500">
                    {d.getMonth() + 1}/{d.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {rooms.map((room) => {
            const roomBookings = activeBookings.filter((b) => b.roomId === room.id);
            const barLayouts = assignBarLanes(roomBookings, dates);
            const maxLane = roomBookings.reduce((max, b) => Math.max(max, barLayouts.get(b.id)?.lane ?? 0), 0);
            const rowHeight = Math.max(52, ROW_PADDING * 2 + (maxLane + 1) * (BAR_HEIGHT + BAR_GAP));
            const manualOccupied = roomStatusById[room.id] === "occupied";

            return (
              <div key={room.id} className="flex border-b border-neutral-100 last:border-b-0">
                <div className="flex w-[180px] shrink-0 items-center px-3 py-2 text-[11px] font-semibold text-neutral-800">
                  {room.name}
                </div>
                <div
                  className="relative shrink-0 border-l border-neutral-100 bg-neutral-50/40"
                  style={{ width: gridWidth, height: rowHeight }}
                >
                  <div className="absolute inset-0 flex">
                    {dates.map((d, i) => (
                      <div
                        key={`${room.id}-grid-${toYmd(d)}`}
                        className={`shrink-0 border-r border-neutral-100/80 ${i % 2 === 0 ? "bg-white/40" : ""}`}
                        style={{ width: COL_WIDTH, height: rowHeight }}
                      />
                    ))}
                  </div>

                  {manualOccupied ? (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded bg-neutral-400/75 px-2 text-[10px] font-medium text-white"
                      style={{
                        left: BAR_GAP,
                        width: gridWidth - BAR_GAP * 2,
                        height: BAR_HEIGHT,
                        lineHeight: `${BAR_HEIGHT}px`,
                      }}
                      title="Manual occupied override"
                    >
                      Occupied (manual)
                    </div>
                  ) : (
                    roomBookings.map((b) => {
                      const layout = barLayouts.get(b.id);
                      if (!layout) return null;
                      const top = ROW_PADDING + layout.lane * (BAR_HEIGHT + BAR_GAP);
                      const tooltip = [
                        `Guest: ${b.fullName}`,
                        `Room: ${b.roomName}`,
                        `Check-in: ${b.checkIn}`,
                        `Check-out: ${b.checkOut}`,
                        `Source: ${sourceLabel(b.source)}`,
                        `Status: ${b.status}`,
                      ].join("\n");

                      return (
                        <div
                          key={b.id}
                          className={`absolute overflow-hidden rounded px-1.5 text-[10px] font-medium shadow-sm ${sourceBarClass(b.source)}`}
                          style={{
                            left: layout.left,
                            width: layout.width,
                            top,
                            height: BAR_HEIGHT,
                            lineHeight: `${BAR_HEIGHT}px`,
                          }}
                          title={tooltip}
                        >
                          <span className="block truncate">{b.fullName}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-4 py-3 text-[10px] text-neutral-600 sm:px-5">
        <Legend color="bg-emerald-500/85" label="Website" />
        <Legend color="bg-blue-500/85" label="Airbnb" />
        <Legend color="bg-orange-500/85" label="Booking.com" />
        <Legend color="bg-neutral-400/75" label="Manual occupied" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-3 w-5 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}
