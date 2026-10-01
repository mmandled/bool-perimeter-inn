const axios = require("axios");

function getSecretKey() {
  return process.env.PAYMONGO_SECRET_KEY || "";
}

function authHeader() {
  const secretKey = getSecretKey();
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function createCheckoutSession({ bookingId, amountPhp, paymentMethod, booking, frontendUrl }) {
  const secretKey = getSecretKey();
  const successUrl = `${frontendUrl}/success?bookingId=${encodeURIComponent(bookingId)}`;
  const cancelUrl = `${frontendUrl}/#booking`;

  if (!secretKey) {
    return {
      checkoutUrl: `${successUrl}&sessionId=${encodeURIComponent(`mock_${bookingId}`)}`,
      sessionId: `mock_${bookingId}`,
    };
  }

  const amountCentavos = Math.round(amountPhp * 100);
  const paymentMethodTypes = paymentMethod === "card" ? ["card"] : ["gcash"];

  const payload = {
    data: {
      attributes: {
        cancel_url: cancelUrl,
        success_url: successUrl,
        description: `Bool Perimeter's Inn — ${booking.roomId}`,
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            name: "Room booking",
            amount: amountCentavos,
            currency: "PHP",
            quantity: 1,
          },
        ],
        billing: {
          name: booking.fullName,
          email: booking.email,
          phone: booking.phone,
        },
        send_email_receipt: true,
        metadata: {
          booking_id: bookingId,
        },
      },
    },
  };

  const r = await axios.post("https://api.paymongo.com/v1/checkout_sessions", payload, {
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 20000,
  });

  const session = r.data?.data;
  const checkoutUrl = session?.attributes?.checkout_url;
  const sessionId = session?.id;
  if (!checkoutUrl || !sessionId) {
    throw new Error("PayMongo did not return a checkout session");
  }

  return { checkoutUrl, sessionId };
}

async function verifyCheckoutSession(sessionId) {
  if (!sessionId) {
    return { paid: false, sessionId: "" };
  }

  if (sessionId.startsWith("mock_") || !getSecretKey()) {
    return { paid: true, sessionId };
  }

  const r = await axios.get(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
    timeout: 20000,
  });

  const session = r.data?.data;
  const status = session?.attributes?.status;
  const amountCentavos = session?.attributes?.line_items?.[0]?.amount;
  const paid = status === "paid";

  return {
    paid,
    sessionId,
    amountPhp: amountCentavos ? amountCentavos / 100 : undefined,
  };
}

module.exports = { createCheckoutSession, verifyCheckoutSession };
