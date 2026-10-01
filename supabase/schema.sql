-- Bool Perimeter's Inn — Supabase schema
-- Run in Supabase SQL editor or via CLI migration.

create extension if not exists "pgcrypto";

-- Rooms
create table if not exists public.rooms (
  id text primary key check (id in ('single', 'bunk', 'double')),
  name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  status text not null default 'available' check (status in ('available', 'occupied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  guest_name text not null,
  email text not null default '',
  phone text not null default '',
  room_id text not null references public.rooms(id),
  check_in date not null,
  check_out date not null,
  source text not null default 'website' check (source in ('website', 'airbnb', 'booking_com', 'manual_occupied')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  booking_status text not null default 'pending' check (booking_status in ('pending', 'confirmed', 'archived')),
  booking_type text not null default 'online' check (booking_type in ('online', 'walk-in', 'manual')),
  payment_method text not null default 'gcash' check (payment_method in ('gcash', 'card')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_valid check (check_out > check_in)
);

create index if not exists bookings_room_dates_idx on public.bookings (room_id, check_in, check_out);
create index if not exists bookings_ticket_idx on public.bookings (ticket_number);

-- Walk-ins
create table if not exists public.walkins (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  phone text not null default '',
  room_id text not null references public.rooms(id),
  check_in date not null,
  check_out date not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint walkins_dates_valid check (check_out > check_in)
);

-- Payments (PayMongo integration)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text not null default 'gcash' check (payment_method in ('gcash', 'card')),
  paymongo_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admins (login is handled by Supabase Auth; user_id links auth.users)
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  user_id uuid unique references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- Email logs
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  type text not null check (type in ('booking_confirmation_customer', 'booking_confirmation_owner', 'other')),
  sent_at timestamptz not null default now(),
  booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'retrying')),
  error_message text
);

-- Seed default rooms
insert into public.rooms (id, name, quantity, status) values
  ('single', 'Standard Single Room', 1, 'available'),
  ('bunk', 'Bunk Bed Room', 4, 'available'),
  ('double', 'Standard Double Room', 1, 'available')
on conflict (id) do nothing;

-- Row Level Security (permissive for anon key — tighten in production)
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.walkins enable row level security;
alter table public.payments enable row level security;
alter table public.admins enable row level security;
alter table public.email_logs enable row level security;

create policy "rooms_all" on public.rooms for all using (true) with check (true);
create policy "bookings_all" on public.bookings for all using (true) with check (true);
create policy "walkins_all" on public.walkins for all using (true) with check (true);
create policy "payments_all" on public.payments for all using (true) with check (true);
create policy "email_logs_all" on public.email_logs for all using (true) with check (true);
-- admins: no public access via anon key
create policy "admins_none" on public.admins for select using (false);

-- Authorization helper: true only when the current Auth UID is linked in admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id is not null
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
