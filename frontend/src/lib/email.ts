import emailjs from "@emailjs/browser";
import type { Booking } from "../types";
import { getRoomById } from "../data/rooms";

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const ownerTemplateId = import.meta.env.VITE_EMAILJS_OWNER_TEMPLATE_ID as string | undefined;
const customerTemplateId = import.meta.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID as string | undefined;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

type EmailResult = { sent?: boolean; skipped?: boolean; alreadySent?: boolean };

function isEmailJsConfigured() {
  return Boolean(serviceId && ownerTemplateId && customerTemplateId && publicKey);
}

async function sendViaBackend(booking: Booking): Promise<EmailResult> {
  const res = await fetch("/api/email/booking-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: booking.id,
      ticketNumber: booking.ticketNumber,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomId: booking.roomId,
      roomName: booking.roomName,
    }),
  });

  if (res.status === 503) return { skipped: true };
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Email API failed (${res.status})`);
  }
  return res.json() as Promise<EmailResult>;
}

async function sendViaEmailJs(booking: Booking) {
  if (!isEmailJsConfigured()) return;

  const room = getRoomById(booking.roomId);
  const dateRange = `${booking.checkIn} to ${booking.checkOut}`;
  const payload = {
    subject_customer: "Booking Confirmation",
    subject_admin: "New Booking Received",
    customer_name: booking.fullName,
    customer_email: booking.email,
    customer_phone: booking.phone,
    room_name: room?.name ?? booking.roomId,
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    status: booking.status,
    payment_method: booking.paymentMethod,
    booking_reference: booking.ticketNumber,
    booking_date_range: dateRange,
    customer_message:
      `Hi ${booking.fullName}, your booking at Bool Perimeter's Inn is confirmed.\n` +
      `Room: ${room?.name ?? booking.roomName}\nDates: ${dateRange}\nReference: ${booking.ticketNumber}\n\n` +
      "We look forward to welcoming you.",
    admin_summary:
      `New booking received:\n` +
      `Name: ${booking.fullName}\nEmail: ${booking.email}\nPhone: ${booking.phone}\n` +
      `Room: ${room?.name ?? booking.roomName}\nDates: ${dateRange}`,
  };

  await Promise.all([
    emailjs.send(serviceId!, ownerTemplateId!, payload, { publicKey: publicKey! }),
    emailjs.send(serviceId!, customerTemplateId!, payload, { publicKey: publicKey! }),
  ]);
}

export async function sendBookingEmails(booking: Booking): Promise<EmailResult> {
  try {
    return await sendViaBackend(booking);
  } catch (backendErr) {
    console.warn("Backend email failed, trying EmailJS fallback", backendErr);
    await sendViaEmailJs(booking);
    return { sent: true };
  }
}

/** Send confirmation email only when admin approves pending → confirmed. */
export async function sendBookingEmailsOnConfirm(booking: Booking) {
  const key = `bpi_email_sent_${booking.id}`;
  if (localStorage.getItem(key) === "1") return;
  try {
    const result = await sendBookingEmails(booking);
    if (result.skipped || result.alreadySent) return;
    if (result.sent) {
      localStorage.setItem(key, "1");
    }
  } catch (e) {
    console.error("Confirmation email failed", e);
  }
}
