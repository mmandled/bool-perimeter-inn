alter table public.payments rename column method to payment_method;
alter table public.payments add column if not exists paymongo_payment_id text;
