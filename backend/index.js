const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { z } = require("zod");
const { sendBookingEmails, isEmailConfigured } = require("./services/emailService");
const { createCheckoutSession, verifyCheckoutSession } = require("./services/paymongoService");

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

const CheckoutSchema = z.object({
  bookingId: z.string().min(1),
  amountPhp: z.number().positive(),
  paymentMethod: z.enum(["gcash", "card"]),
  booking: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    roomId: z.enum(["single", "bunk", "double"]),
  }),
});

const VerifySchema = z.object({
  sessionId: z.string().min(1),
});

const BookingEmailSchema = z.object({
  id: z.string().min(1),
  ticketNumber: z.string().optional(),
  fullName: z.string().min(1),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  roomId: z.enum(["single", "bunk", "double"]),
  roomName: z.string().optional(),
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    email: isEmailConfigured(),
    supabase: Boolean(process.env.SUPABASE_URL),
    paymongo: Boolean(process.env.PAYMONGO_SECRET_KEY),
  });
});

app.post("/api/email/booking-confirmation", async (req, res) => {
  const parsed = BookingEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({ skipped: true, reason: "SMTP not configured" });
  }

  try {
    const result = await sendBookingEmails(parsed.data);
    return res.json(result);
  } catch (err) {
    const msg = err?.message ?? "Email send failed";
    return res.status(500).json({ error: String(msg) });
  }
});

app.post("/api/checkout", async (req, res) => {
  const parsed = CheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  try {
    const result = await createCheckoutSession({
      ...parsed.data,
      frontendUrl,
    });
    return res.json(result);
  } catch (err) {
    const msg =
      err?.response?.data?.errors?.[0]?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "PayMongo request failed";
    return res.status(500).json({ error: String(msg) });
  }
});

app.post("/api/checkout/verify", async (req, res) => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
  }

  try {
    const result = await verifyCheckoutSession(parsed.data.sessionId);
    return res.json(result);
  } catch (err) {
    const msg =
      err?.response?.data?.errors?.[0]?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "Payment verification failed";
    return res.status(500).json({ error: String(msg) });
  }
});

const port = Number(process.env.PORT || 5174);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
