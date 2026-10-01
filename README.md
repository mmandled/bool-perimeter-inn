## Bool Perimeter’s Inn — Resort Booking (React + Tailwind + PayMongo + Admin)

### What’s included
- **Landing page UI** matching your screenshot layout:
  - Hero (beach background + navbar + glass card + buttons)
  - Rooms section (3 cards)
  - Booking section (purple band + form card)
  - Features section (Location / Free Wi‑Fi / Contact)
  - Footer
- **Booking flow**
  - Stores a draft booking in `localStorage`
  - Validates required fields + dates
  - Calls backend `/api/checkout` then redirects to **PayMongo** checkout URL
- **After payment**
  - `/success` confirms booking locally and shows confirmation message
- **Email notifications (optional)**
  - Uses **EmailJS** (frontend) to notify owner + customer
- **Admin dashboard**
  - Route: `/admin`
  - Login uses **Supabase Auth** (email/password)
  - Access is granted only if the signed-in user is linked in the `admins` table
  - View bookings, add walk-ins, update status (pending/confirmed)

---

### Run locally (Windows / PowerShell)

#### 1) Backend
```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

#### 2) Frontend
```powershell
cd ..\frontend
copy .env.example .env
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5174`

---

### PayMongo notes
- Set `PAYMONGO_SECRET_KEY` in `backend/.env` to enable real checkout sessions.
- If `PAYMONGO_SECRET_KEY` is not set, `/api/checkout` returns a **mock** checkout URL that navigates directly to `/success`.

---

### Admin login
Admin login uses Supabase Auth. Create the user in the Supabase Dashboard and link their Auth UID in `public.admins.user_id`. See `supabase/migrations/20261001_admin_auth_user_id.sql`.

