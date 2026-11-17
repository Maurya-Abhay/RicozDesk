-- Password reset OTPs are server-only records. The Edge Function owns all access.

create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_otps_user_created_idx
  on public.password_reset_otps(user_id, created_at desc);

alter table public.password_reset_otps enable row level security;
revoke all on public.password_reset_otps from anon, authenticated;
