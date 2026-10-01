import { useMemo, useState } from "react";
import { z } from "zod";
import { rooms } from "../data/rooms";
import { getAvailabilityStatus } from "../lib/availability";
import { validateRoomAvailability } from "../lib/bookingRules";
import { PaymentModal } from "../components/PaymentModal";
import { useBookings } from "../state/bookingStore";
import { createCheckoutSession } from "../lib/api";
import { parseYmd } from "../lib/dates";
import { savePendingCheckout, updatePendingCheckoutSessionId } from "../lib/pendingCheckout";
import { calculateBookingAmount } from "../lib/pricing";
import { useReveal } from "../lib/useReveal";

const BookingSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(7, "Enter a valid phone number"),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    roomId: z.enum(["single", "bunk", "double"]),
  })
  .superRefine((val, ctx) => {
    const inD = parseYmd(val.checkIn);
    const outD = parseYmd(val.checkOut);
    if (!inD || !outD) return;
    if (outD <= inD) {
      ctx.addIssue({ code: "custom", message: "Check-out must be after check-in", path: ["checkOut"] });
    }
  });

type FormState = z.infer<typeof BookingSchema>;
const websiteRooms = rooms.filter((r) => r.bookingSource === "website");

export function BookingSection() {
  const { bookings, bookingFormDraft, setBookingFormDraft, roomStatusById } = useBookings();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { ref: sectionRef, shown: sectionShown } = useReveal<HTMLDivElement>();

  const [form, setForm] = useState<FormState>({
    fullName: bookingFormDraft.fullName,
    email: bookingFormDraft.email,
    phone: bookingFormDraft.phone,
    checkIn: bookingFormDraft.checkIn,
    checkOut: bookingFormDraft.checkOut,
    roomId: bookingFormDraft.roomId,
  });

  function resetFormState() {
    const blank: FormState = {
      fullName: "",
      email: "",
      phone: "",
      checkIn: "",
      checkOut: "",
      roomId: "bunk",
    };
    setForm(blank);
    setBookingFormDraft(blank);
    setError(null);
  }

  const effectiveForm = useMemo<FormState>(() => {
    const defaultRoom = websiteRooms[0]?.id ?? "bunk";
    const draftRoom =
      rooms.find((r) => r.id === bookingFormDraft.roomId && r.bookingSource === "website")?.id ?? defaultRoom;
    const hasDraftDates = Boolean(bookingFormDraft.checkIn && bookingFormDraft.checkOut);
    return {
      ...form,
      checkIn: hasDraftDates ? bookingFormDraft.checkIn : form.checkIn,
      checkOut: hasDraftDates ? bookingFormDraft.checkOut : form.checkOut,
      roomId: hasDraftDates ? draftRoom : form.roomId,
    };
  }, [form, bookingFormDraft.checkIn, bookingFormDraft.checkOut, bookingFormDraft.roomId]);

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === effectiveForm.roomId), [effectiveForm.roomId]);
  const availability = useMemo(() => {
    if (!selectedRoom) return null;
    if (!effectiveForm.checkIn || !effectiveForm.checkOut) {
      if (roomStatusById[selectedRoom.id] === "occupied") {
        return { isAvailable: false, remaining: 0, booked: selectedRoom.inventoryCount };
      }
      return null;
    }
    return getAvailabilityStatus(
      selectedRoom,
      bookings,
      effectiveForm.checkIn,
      effectiveForm.checkOut,
      roomStatusById[selectedRoom.id],
    );
  }, [selectedRoom, bookings, effectiveForm.checkIn, effectiveForm.checkOut, roomStatusById]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = BookingSchema.safeParse(effectiveForm);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    try {
      setSubmitting(true);
      if (selectedRoom) {
        const res = validateRoomAvailability({
          room: selectedRoom,
          bookings,
          checkIn: parsed.data.checkIn,
          checkOut: parsed.data.checkOut,
          manualStatus: roomStatusById[selectedRoom.id],
        });
        if (res.ok === false) {
          setError(res.message);
          setSubmitting(false);
          return;
        }
      }

      setBookingFormDraft(parsed.data);
      setPaymentOpen(true);
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <section id="booking" className="w-full bg-brand-100 py-16">
      <div
        ref={sectionRef}
        className={`max-w-7xl mx-auto grid grid-cols-1 items-center gap-10 px-6 md:grid-cols-2 reveal ${
          sectionShown ? "reveal-show" : ""
        }`}
      >
        <div className="text-left">
          <div className="text-[10px] font-semibold tracking-[0.22em] text-yellow-700/80">
            BOOK YOUR STAY
          </div>
          <h2 className="mt-3 font-heading text-3xl text-neutral-900">Easy Booking</h2>
          <p className="mt-3 max-w-[340px] text-xs text-neutral-600">
            Choose your dates and check availability. We&apos;ll take care of the rest.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  value={form.fullName}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, fullName: e.target.value }));
                    setBookingFormDraft({ fullName: e.target.value });
                  }}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                />
              </Field>
              <Field label="Phone Number">
                <input
                  value={form.phone}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, phone: e.target.value }));
                    setBookingFormDraft({ phone: e.target.value });
                  }}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                />
              </Field>
            </div>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  setBookingFormDraft({ email: e.target.value });
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Check-in">
                <input
                  type="date"
                  value={effectiveForm.checkIn}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, checkIn: e.target.value }));
                    setBookingFormDraft({ checkIn: e.target.value });
                  }}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                />
              </Field>
              <Field label="Check-out">
                <input
                  type="date"
                  value={effectiveForm.checkOut}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, checkOut: e.target.value }));
                    setBookingFormDraft({ checkOut: e.target.value });
                  }}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                />
              </Field>
            </div>

            <Field label="Room selection">
              <select
                value={effectiveForm.roomId}
                onChange={(e) => {
                  const roomId = e.target.value as FormState["roomId"];
                  setForm((p) => ({ ...p, roomId }));
                  setBookingFormDraft({ roomId });
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              >
                {websiteRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            {availability ? (
              <div className="flex items-center justify-between text-[11px]">
                <div className="text-neutral-600">
                  Availability:{" "}
                  <span className={availability.isAvailable ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {availability.isAvailable ? "Available" : "Occupied"}
                  </span>
                </div>
                <div className="text-neutral-500">
                  Remaining: <span className="font-semibold">{availability.remaining}</span>
                </div>
              </div>
            ) : null}

            {error ? <div className="text-[11px] font-medium text-red-600">{error}</div> : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-md bg-brand-600 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01] disabled:opacity-60"
            >
              {submitting ? "Checking..." : "Book & Pay"}
            </button>
          </form>
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setSubmitting(false);
        }}
        onConfirm={async (method) => {
          const parsed = BookingSchema.parse(effectiveForm);
          const room = rooms.find((r) => r.id === parsed.roomId);
          if (!room) throw new Error("Room not found.");

          const amountPhp = calculateBookingAmount(parsed.checkIn, parsed.checkOut, room.pricePhpPerNight);
          const bookingId = crypto.randomUUID();

          savePendingCheckout({
            bookingId,
            fullName: parsed.fullName,
            email: parsed.email,
            phone: parsed.phone,
            checkIn: parsed.checkIn,
            checkOut: parsed.checkOut,
            roomId: parsed.roomId,
            roomName: room.name,
            paymentMethod: method,
            amountPhp,
          });

          const { checkoutUrl, sessionId } = await createCheckoutSession({
            bookingId,
            amountPhp,
            paymentMethod: method,
            booking: parsed,
          });

          updatePendingCheckoutSessionId(sessionId);
          resetFormState();
          window.location.href = checkoutUrl;
        }}
      />
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <div className="mb-1 text-[10px] font-semibold text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

