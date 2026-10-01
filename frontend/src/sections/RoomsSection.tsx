import { useState } from "react";
import { RoomDetailModal } from "../components/RoomDetailModal";
import { rooms } from "../data/rooms";
import type { Room } from "../types";
import { useBookings } from "../state/bookingStore";
import { useReveal } from "../lib/useReveal";
import { isRoomOccupiedNow } from "../lib/availability";

export function RoomsSection() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Room | null>(null);
  const { roomStatusById, bookings } = useBookings();
  const { ref: titleRef, shown: titleShown } = useReveal<HTMLDivElement>();

  return (
    <section id="rooms" className="w-full bg-neutral-50 py-16">
      <div ref={titleRef} className={`max-w-7xl mx-auto px-6 text-center reveal ${titleShown ? "reveal-show" : ""}`}>
        <div className="text-[10px] font-semibold tracking-[0.22em] text-yellow-700/80">
          OUR ROOMS
        </div>
        <h2 className="mt-3 font-heading text-3xl text-neutral-900">Stay in Comfort</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-xs text-neutral-600">
          Relax in our clean and cozy rooms, perfect for solo travelers, couples, and families.
        </p>
      </div>

      <div className="max-w-7xl mx-auto mt-12 grid grid-cols-1 gap-7 px-6 md:grid-cols-3">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            idx={idx}
            occupiedNow={isRoomOccupiedNow(room, bookings, roomStatusById[room.id])}
            onView={() => {
              setSelected(room);
              setOpen(true);
            }}
          />
        ))}
      </div>

      <RoomDetailModal open={open} room={selected} onClose={() => setOpen(false)} />
    </section>
  );
}

function RoomCard({
  room,
  idx,
  occupiedNow,
  onView,
}: {
  room: Room;
  idx: number;
  occupiedNow: boolean;
  onView: () => void;
}) {
  const { ref, shown } = useReveal<HTMLElement>({ rootMargin: "0px 0px -12% 0px" });
  return (
    <article
      ref={ref}
      style={{ transitionDelay: `${Math.min(idx, 6) * 70}ms` }}
      className={`overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5 reveal ${shown ? "reveal-show" : ""}`}
    >
      <img src={room.imageUrl} alt={room.name} className="h-44 w-full object-cover" />
      <div className="px-5 py-5 text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold text-neutral-900">{room.name}</div>
          <div
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              occupiedNow
                ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
            }`}
          >
            {occupiedNow ? "Occupied" : "Available"}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-500">
          <span>
            {room.guests} {room.guests === 1 ? "guest" : "guests"}
          </span>
          <span className="h-1 w-1 rounded-full bg-neutral-300" />
          <span>{room.bedsLabel}</span>
        </div>
        <div className="mt-3 text-[11px] font-semibold text-brand-600">₱{room.pricePhpPerNight} / night</div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onView}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-[10px] font-semibold text-neutral-700 transition-transform duration-200 hover:-translate-y-1 hover:shadow hover:shadow-black/5"
          >
            {room.bookingSource === "website" ? "View Detail" : room.externalCtaLabel ?? "View Detail"}
          </button>
        </div>
      </div>
    </article>
  );
}

