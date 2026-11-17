-- Email verification happens before a public Auth account and role request are created.

create table if not exists public.signup_email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  verified_at timestamptz,
  verification_token_hash text,
  token_expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signup_email_otps_email_created_idx
  on public.signup_email_otps(email, created_at desc);

alter table public.signup_email_otps enable row level security;
revoke all on public.signup_email_otps from anon, authenticated;
