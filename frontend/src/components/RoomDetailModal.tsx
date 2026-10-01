import { useMemo, useState } from "react";
import type { Room } from "../types";
import { Modal } from "./Modal";
import { useBookings } from "../state/bookingStore";
import { getAvailabilityStatus, isRoomOccupiedNow } from "../lib/availability";
import { scrollToId } from "../lib/scrollToId";

type Props = {
  open: boolean;
  room: Room | null;
  onClose: () => void;
};

export function RoomDetailModal({ open, room, onClose }: Props) {
  const { bookings, setBookingFormDraft, roomStatusById } = useBookings();
  const [activeImg, setActiveImg] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const availability = useMemo(() => {
    if (!room) return null;
    const manual = roomStatusById[room.id];
    if (!checkIn || !checkOut) {
      if (isRoomOccupiedNow(room, bookings, manual)) return { isAvailable: false, remaining: 0, booked: room.inventoryCount };
      return { isAvailable: true, remaining: room.inventoryCount, booked: 0 };
    }
    return getAvailabilityStatus(room, bookings, checkIn, checkOut, manual);
  }, [room, bookings, checkIn, checkOut, roomStatusById]);

  if (!room) return null;

  const gallery = room.gallery?.length ? room.gallery : [room.imageUrl];
  const mainSrc = gallery[Math.min(activeImg, gallery.length - 1)];

  return (
    <Modal open={open} onClose={onClose} title={room.name} maxWidthClassName="max-w-5xl">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-black/5">
            <img src={mainSrc} alt={room.name} className="h-[320px] w-full object-cover" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {gallery.slice(0, 3).map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setActiveImg(i)}
                className={`overflow-hidden rounded-xl ring-1 transition ${
                  i === activeImg ? "ring-brand-500" : "ring-black/5 hover:ring-black/10"
                }`}
              >
                <img src={src} alt={`${room.name} photo ${i + 1}`} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm text-neutral-700">{room.shortDescription}</p>

          <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-neutral-50 p-4 ring-1 ring-black/5">
            <Info label="Size" value={room.sizeLabel} />
            <Info label="Bed type" value={room.bedType} />
            <Info label="Capacity" value={room.capacityLabel} />
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-neutral-900">Amenities</div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              {room.amenities.map((a) => (
                <div key={a.key} className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-black/5">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-1 ring-brand-200"
                    aria-hidden="true"
                  >
                    <AmenityIcon amenityKey={a.key} />
                  </span>
                  <span className="text-xs text-neutral-700">{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.22em] text-yellow-700/80">PRICE</div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  ₱{room.pricePhpPerNight} <span className="text-sm font-medium text-neutral-500">/ night</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold tracking-[0.22em] text-yellow-700/80">AVAILABILITY</div>
                <div
                  className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    availability?.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {availability?.isAvailable ? "Available" : "Occupied"}
                </div>
              </div>
            </div>

            {room.bookingSource === "website" ? (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-1 text-[10px] font-semibold text-neutral-500">Check-in</div>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[10px] font-semibold text-neutral-500">Check-out</div>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={availability ? !availability.isAvailable : false}
                  onClick={() => {
                    setBookingFormDraft({
                      roomId: room.id,
                      checkIn,
                      checkOut,
                    });
                    onClose();
                    scrollToId("booking");
                  }}
                  className="mt-4 w-full rounded-md bg-brand-600 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Book This Room
                </button>
                <div className="mt-2 text-[11px] text-neutral-500">
                  Selecting dates helps determine if the room is available.
                </div>
              </>
            ) : (
              <>
                <a
                  href={room.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-brand-600 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01]"
                >
                  {room.externalCtaLabel ?? "Book Externally"}
                </a>
                <div className="mt-2 text-[11px] text-neutral-500">
                  This room is managed via {room.bookingSource === "airbnb" ? "Airbnb" : "Booking.com"}.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-neutral-500">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function AmenityIcon({ amenityKey }: { amenityKey: string }) {
  switch (amenityKey) {
    case "wifi":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <path d="M3.5 9.5a13 13 0 0 1 17 0" />
          <path d="M6.7 12.8a8.4 8.4 0 0 1 10.6 0" />
          <path d="M10.1 16.1a3.8 3.8 0 0 1 3.8 0" />
          <circle cx="12" cy="19" r="1" className="fill-current stroke-0" />
        </svg>
      );
    case "ac":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 8h16M6 8v3m12-3v3M8 12a4 4 0 0 0 8 0" />
        </svg>
      );
    case "towel":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <rect x="5" y="6" width="14" height="12" rx="2" />
          <path d="M9 6v12" />
        </svg>
      );
    case "shower":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <path d="M6 9h10a4 4 0 0 0-8 0" />
          <path d="M8 13v.1M11 14v.1M14 13v.1M17 14v.1" />
        </svg>
      );
    case "desk":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 10h16M6 10v8m12-8v8M10 13h4" />
        </svg>
      );
    case "water":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <path d="M12 4s4 4.5 4 7.5a4 4 0 1 1-8 0C8 8.5 12 4 12 4Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

