import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getRoomById } from "../data/rooms";
import { verifyCheckoutSession } from "../lib/api";
import { validateRoomAvailability } from "../lib/bookingRules";
import { insertPaymentToDb } from "../lib/db/paymentRepository";
import { clearPendingCheckout, loadPendingCheckout } from "../lib/pendingCheckout";
import { useBookings } from "../state/bookingStore";
import type { Booking } from "../types";

type PageState = "loading" | "success" | "error";

export function SuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") ?? "";
  const { bookings, addBooking, getBooking, roomStatusById, isLoading } = useBookings();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);
  const finalizedRef = useRef(false);

  const existingBooking = useMemo(
    () => (bookingId ? getBooking(bookingId) : undefined),
    [bookingId, getBooking],
  );

  useEffect(() => {
    if (isLoading) return;
    if (finalizedRef.current) return;

    async function finalize() {
      if (!bookingId) {
        setErrorMsg("Missing booking reference.");
        setPageState("error");
        return;
      }

      if (existingBooking) {
        setSavedBooking(existingBooking);
        setPageState("success");
        return;
      }

      const pending = loadPendingCheckout();
      if (!pending || pending.bookingId !== bookingId) {
        setErrorMsg("Payment session not found. Your booking was not saved.");
        setPageState("error");
        return;
      }

      if (!pending.sessionId) {
        setErrorMsg("Payment session is incomplete.");
        setPageState("error");
        return;
      }

      try {
        const verified = await verifyCheckoutSession(pending.sessionId);
        if (!verified.paid) {
          clearPendingCheckout();
          setErrorMsg("Payment was not completed. No booking was created.");
          setPageState("error");
          return;
        }

        const room = getRoomById(pending.roomId);
        if (room) {
          const availability = validateRoomAvailability({
            room,
            bookings,
            checkIn: pending.checkIn,
            checkOut: pending.checkOut,
            manualStatus: roomStatusById[room.id],
          });
          if (availability.ok === false) {
            setErrorMsg(
              "Payment received but the room is no longer available. Please contact the inn for assistance.",
            );
            setPageState("error");
            return;
          }
        }

        finalizedRef.current = true;

        const booking = addBooking({
          id: pending.bookingId,
          fullName: pending.fullName,
          email: pending.email,
          phone: pending.phone,
          checkIn: pending.checkIn,
          checkOut: pending.checkOut,
          roomId: pending.roomId,
          roomName: pending.roomName,
          type: "online",
          paymentMethod: pending.paymentMethod,
          source: "website",
          notes: "",
          paymentStatus: "paid",
        });

        try {
          await insertPaymentToDb({
            bookingId: booking.id,
            amount: pending.amountPhp,
            paymentMethod: pending.paymentMethod,
            paymongoPaymentId: pending.sessionId,
            status: "paid",
          });
        } catch (e) {
          console.error("Payment record sync failed", e);
        }

        clearPendingCheckout();
        setSavedBooking(booking);
        setPageState("success");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Unable to verify payment.");
        setPageState("error");
      }
    }

    finalize();
  }, [bookingId, bookings, existingBooking, isLoading, addBooking, roomStatusById]);

  const booking = savedBooking ?? existingBooking;
  const roomName = booking ? (getRoomById(booking.roomId)?.name ?? booking.roomName) : "";

  return (
    <div className="w-full min-h-[100svh] bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mx-auto max-w-[720px] rounded-2xl bg-white p-10 text-center shadow-soft ring-1 ring-black/5">
          {pageState === "loading" ? (
            <>
              <div className="text-[10px] font-semibold tracking-[0.22em] text-yellow-700/80">PROCESSING</div>
              <h1 className="mt-3 font-heading text-3xl text-neutral-900">Verifying your payment...</h1>
              <p className="mt-4 text-sm text-neutral-600">Please wait while we confirm your reservation.</p>
            </>
          ) : null}

          {pageState === "error" ? (
            <>
              <div className="text-[10px] font-semibold tracking-[0.22em] text-red-600/80">PAYMENT ISSUE</div>
              <h1 className="mt-3 font-heading text-3xl text-neutral-900">Unable to complete booking</h1>
              <p className="mt-4 text-sm text-neutral-600">{errorMsg}</p>
              <div className="mt-8">
                <Link
                  to="/#booking"
                  className="rounded-full bg-brand-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Return Home
                </Link>
              </div>
            </>
          ) : null}

          {pageState === "success" && booking ? (
            <>
              <div className="text-[10px] font-semibold tracking-[0.22em] text-yellow-700/80">BOOKING RECEIVED</div>
              <h1 className="mt-3 font-heading text-3xl text-neutral-900">Thank you for your reservation</h1>
              <p className="mt-4 text-sm text-neutral-600">
                Your booking is now pending confirmation from the inn.
              </p>

              <div className="mx-auto mt-6 max-w-[520px] rounded-xl bg-neutral-50 p-5 text-left text-xs text-neutral-700 ring-1 ring-black/5">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Info label="Booking Reference" value={booking.ticketNumber} />
                  <Info label="Guest Name" value={booking.fullName} />
                  <Info label="Room" value={roomName} />
                  <Info label="Payment Status" value="Paid" />
                  <Info label="Check-in" value={booking.checkIn} />
                  <Info label="Check-out" value={booking.checkOut} />
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/"
                  className="rounded-full bg-brand-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Return Home
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-neutral-500">{label}</div>
      <div className="mt-0.5 font-medium text-neutral-900">{value}</div>
    </div>
  );
}
