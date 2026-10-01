-- Phase 1A: link public.admins to Supabase Auth without deleting legacy rows.
-- password_hash and email are kept for backward compatibility; they are no longer
-- used by the application for login.

alter table public.admins
  add column if not exists user_id uuid unique references auth.users(id) on delete cascade;

create index if not exists admins_user_id_idx on public.admins (user_id);

-- Authorization helper used by the frontend (and later by RLS).
-- SECURITY DEFINER so the check works while the admins table stays unreadable
-- to the anon/authenticated roles (existing admins_none policy is preserved).
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
