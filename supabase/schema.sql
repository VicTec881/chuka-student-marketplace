-- Chuka Student Marketplace: database schema for Supabase (Postgres).
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste this -> Run.
-- It is safe to run again (everything uses "if not exists").

create table if not exists public.listings (
  id               text primary key default gen_random_uuid()::text,
  title            text        not null check (char_length(title) between 3 and 80),
  price            integer     not null check (price between 10 and 10000000),
  category         text        not null check (category in
                     ('electronics','books','fashion','phones','home','food','sports','other')),
  condition        text        not null,
  badge            text        not null default 'New',
  badge_type       text        not null default 'new',
  description      text        not null check (char_length(description) between 10 and 1000),
  long_description text,
  image            text        not null,
  seller           jsonb       not null,
  sample           boolean     not null default false,  -- demo content, not a real listing
  status           text        not null default 'available'
                     check (status in ('available','sold','removed')),
  created_at       timestamptz not null default now(),
  ip_hash          text                                  -- salted hash, used only for rate limiting
);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_ip_created_idx on public.listings (ip_hash, created_at desc);

-- Lock the table down. With row level security on and NO policies, the public (anon)
-- key cannot read or write anything. Only the server, using the secret key, can.
alter table public.listings enable row level security;
revoke all on public.listings from anon, authenticated;

-- Make sure the server's role can use the table even if the project was created with
-- "Automatically expose new tables" switched off.
grant select, insert, update, delete on public.listings to service_role;

-- ===== Accounts (added with student sign-in). Safe to run again. =====
alter table public.listings add column if not exists owner_email text;   -- who posted it (signed-in students)
create index if not exists listings_owner_idx on public.listings (owner_email);

create table if not exists public.login_codes (
  email           text primary key,
  code_hash       text        not null,   -- HMAC of the 6-digit code; the code itself is never stored
  expires_at      timestamptz not null,
  attempts        integer     not null default 0,
  last_sent_at    timestamptz not null,
  window_start    timestamptz not null,
  sends_in_window integer     not null default 0
);
-- Counts sign-in code requests per (hashed) network address, so the email quota cannot be drained.
create table if not exists public.login_throttle (
  ip_hash      text primary key,
  window_start timestamptz not null,
  count        integer     not null default 0
);
alter table public.login_throttle enable row level security;
revoke all on public.login_throttle from anon, authenticated;
grant select, insert, update, delete on public.login_throttle to service_role;

alter table public.login_codes enable row level security;
revoke all on public.login_codes from anon, authenticated;
grant select, insert, update, delete on public.login_codes to service_role;
