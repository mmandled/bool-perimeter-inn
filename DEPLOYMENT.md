# Bool Perimeter's Inn — Deployment Guide

## Stack

| Layer | Service |
|-------|---------|
| Frontend | Vercel |
| Backend | Render |
| Database | Supabase |
| Payments | PayMongo Checkout Sessions |
| Email | Gmail SMTP (Nodemailer) |

---

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. If upgrading an existing database, also run migrations in `supabase/migrations/`.
4. Copy from **Project Settings → API**:
   - Project URL
   - `anon` public key (frontend)
   - `service_role` key (backend only — never expose in frontend)

### Tables

- `rooms` — room inventory and manual status
- `bookings` — all reservations
- `walkins` — walk-in guest records
- `payments` — PayMongo payment records
- `admins` — admin accounts (future use)
- `email_logs` — sent email audit trail

---

## 2. PayMongo Setup

1. Create an account at [paymongo.com](https://paymongo.com).
2. Enable **GCash** and **Credit Card** payment methods.
3. Copy your **Secret Key** (test or live) from the dashboard.
4. Set `PAYMONGO_SECRET_KEY` in the backend environment.
5. For local testing without PayMongo, leave the key empty — the backend uses mock checkout.

### Payment flow

1. Guest completes booking form → selects GCash or Credit Card
2. Backend creates a PayMongo Checkout Session
3. Guest pays on PayMongo
4. Success redirect → `/success` → booking saved as `pending` + payment record as `paid`
5. Admin confirms booking → confirmation email sent

---

## 3. Backend (Render)

1. Create a **Web Service** on [render.com](https://render.com).
2. Connect your repository.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** `5174` (or use Render's `PORT` env)

### Backend environment variables

```
PORT=5174
FRONTEND_URL=https://your-vercel-domain.vercel.app

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your@gmail.com
OWNER_EMAIL=owner@gmail.com

PAYMONGO_SECRET_KEY=sk_test_xxxx
```

---

## 4. Frontend (Vercel)

1. Import the repository at [vercel.com](https://vercel.com).
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Framework:** Vite

### Frontend environment variables

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

VITE_EMAILJS_SERVICE_ID=        # optional fallback
VITE_EMAILJS_OWNER_TEMPLATE_ID=
VITE_EMAILJS_CUSTOMER_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

### API proxy in production

Vercel must forward `/api` requests to the Render backend. Add `vercel.json` at the project root or configure rewrites:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend.onrender.com/api/$1" }
  ]
}
```

Update `FRONTEND_URL` on the backend to match your Vercel domain.

---

## 5. Gmail SMTP

1. Enable 2FA on your Google account.
2. Generate an **App Password** (Google Account → Security → App passwords).
3. Use that password as `SMTP_PASS`.
4. Set `OWNER_EMAIL` to the address that receives new-booking alerts.

---

## 6. Domain Setup

1. Add your custom domain in Vercel (e.g. `boolperimeter.com`).
2. Update DNS records as instructed by Vercel.
3. Update `FRONTEND_URL` on Render to the production domain.
4. Update PayMongo allowed redirect URLs if required.

---

## 7. Pre-deploy Checklist

- [ ] `supabase/schema.sql` applied
- [ ] Supabase env vars set (frontend + backend)
- [ ] PayMongo secret key set on backend
- [ ] Gmail SMTP configured on backend
- [ ] `FRONTEND_URL` matches Vercel domain
- [ ] Vercel `/api` rewrite points to Render backend
- [ ] `npm run build` passes locally
- [ ] Test booking flow end-to-end (form → PayMongo → success page)
- [ ] Test admin login and status updates
- [ ] Test confirmation email on `pending → confirmed`

---

## 8. Local Development

```powershell
# Terminal 1 — Backend
cd backend
copy .env.example .env
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
copy .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5174
- Vite proxies `/api` to the backend automatically

### Admin login

Admin login uses Supabase Auth (email/password). Create the user in Authentication → Users, then set `public.admins.user_id` to that user's UUID. The old hardcoded `admin@boolperimeter.com` / `admin123` login is removed.
