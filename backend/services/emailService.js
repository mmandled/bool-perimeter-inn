const nodemailer = require("nodemailer");
const { getSupabase } = require("./supabaseClient");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.OWNER_EMAIL,
  );
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function logEmail({ recipient, type, bookingId, status, errorMessage }) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("email_logs").insert({
      recipient,
      type,
      booking_id: bookingId ?? null,
      status,
      error_message: errorMessage ?? null,
    });
  } catch (e) {
    console.error("Failed to write email_logs", e);
  }
}

async function sendWithRetry(transport, mailOptions, meta) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await transport.sendMail(mailOptions);
      await logEmail({ ...meta, status: "sent" });
      return;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await logEmail({
          ...meta,
          status: "retrying",
          errorMessage: String(err?.message ?? err),
        });
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  await logEmail({
    ...meta,
    status: "failed",
    errorMessage: String(lastError?.message ?? lastError),
  });
  throw lastError;
}

async function wasConfirmationAlreadySent(bookingId) {
  const sb = getSupabase();
  if (!sb || !bookingId) return false;
  try {
    const { data, error } = await sb
      .from("email_logs")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("type", "booking_confirmation_owner")
      .eq("status", "sent")
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function sendBookingEmails(booking) {
  if (!isEmailConfigured()) {
    return { skipped: true, reason: "SMTP not configured" };
  }

  if (await wasConfirmationAlreadySent(booking.id)) {
    return { alreadySent: true };
  }

  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const ownerEmail = process.env.OWNER_EMAIL;
  const roomName = booking.roomName || booking.roomId;
  const dateRange = `${booking.checkIn} to ${booking.checkOut}`;
  const reference = booking.ticketNumber || booking.id;

  const customerMail = {
    from,
    to: booking.email,
    subject: "Booking Confirmation",
    text:
      `Hi ${booking.fullName},\n\n` +
      `Your booking at Bool Perimeter's Inn is confirmed.\n\n` +
      `Guest Name: ${booking.fullName}\n` +
      `Room: ${roomName}\n` +
      `Check-in: ${booking.checkIn}\n` +
      `Check-out: ${booking.checkOut}\n` +
      `Booking Reference: ${reference}\n\n` +
      `We look forward to welcoming you.`,
  };

  const ownerMail = {
    from,
    to: ownerEmail,
    subject: "New Booking Received",
    text:
      `A new booking has been received.\n\n` +
      `Guest Name: ${booking.fullName}\n` +
      `Contact: ${booking.email} / ${booking.phone}\n` +
      `Room: ${roomName}\n` +
      `Check-in: ${booking.checkIn}\n` +
      `Check-out: ${booking.checkOut}\n` +
      `Reference: ${reference}`,
  };

  const tasks = [];
  if (booking.email) {
    tasks.push(
      sendWithRetry(transport, customerMail, {
        recipient: booking.email,
        type: "booking_confirmation_customer",
        bookingId: booking.id,
      }),
    );
  }
  tasks.push(
    sendWithRetry(transport, ownerMail, {
      recipient: ownerEmail,
      type: "booking_confirmation_owner",
      bookingId: booking.id,
    }),
  );

  await Promise.all(tasks);
  return { sent: true };
}

module.exports = { isEmailConfigured, sendBookingEmails };
