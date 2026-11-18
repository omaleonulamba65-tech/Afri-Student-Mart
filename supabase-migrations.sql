-- Afri Student Mart — Complete Supabase Schema, Realtime & RLS Migration
-- Run this SQL in Supabase Dashboard -> SQL Editor (idempotent / safe to re-run)

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Auth-linked user profiles & Owner role identification)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  business_name text not null default '',
  email text unique,
  phone_number text unique,
  country_code text default '+234',
  country text default 'Nigeria',
  language text default 'English',
  role text not null default 'buyer', -- 'buyer' | 'seller' | 'owner'
  account_type text not null default 'student', -- 'student' | 'trader' | 'service_provider'
  badges jsonb not null default '["student"]'::jsonb,
  institution text default '',
  state text default '',
  campus text default '',
  level text default '',
  shop_name text default '',
  market text default '',
  service_category text default '',
  price_from numeric default 0,
  id_doc_type text default '',
  id_doc_number text default '',
  business_reg_type text default '',
  business_reg_number text default '',
  secondary_reg_number text default '',
  payout_bank_name text default '',
  payout_account_number text default '',
  payout_account_name text default '',
  profile_pic text default '',
  trust_score numeric default 5.0,
  reviews_count integer default 0,
  blocked boolean not null default false,
  block_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. ITEMS & LISTINGS TABLES
-- ============================================================================
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  price numeric not null,
  condition text not null default 'Neatly Used',
  description text not null default '',
  photos jsonb not null default '[]'::jsonb,
  thumbnails jsonb default '[]'::jsonb,
  video_url text default '',
  seller_id uuid,
  seller_phone text not null,
  seller_name text default '',
  institution text not null default '',
  location text not null default '',
  state text default '',
  country text default 'Nigeria',
  country_code text default '+234',
  make_offer boolean not null default true,
  pay_on_delivery boolean not null default true,
  is_featured boolean not null default false,
  is_boosted boolean not null default false,
  report_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.items add column if not exists seller_id uuid;
alter table public.items add column if not exists seller_name text default '';
alter table public.items add column if not exists thumbnails jsonb default '[]'::jsonb;
alter table public.items add column if not exists video_url text default '';
alter table public.items add column if not exists state text default '';
alter table public.items add column if not exists country text default 'Nigeria';
alter table public.items add column if not exists country_code text default '+234';
alter table public.items add column if not exists make_offer boolean not null default true;
alter table public.items add column if not exists pay_on_delivery boolean not null default true;
alter table public.items add column if not exists is_featured boolean not null default false;
alter table public.items add column if not exists is_boosted boolean not null default false;
alter table public.items add column if not exists report_count integer not null default 0;
alter table public.items add column if not exists status text not null default 'active';

-- ============================================================================
-- 3. MESSAGES TABLE (Real-time Chat: id, sender_id, receiver_id, listing_id, message, created_at)
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid,
  receiver_id uuid,
  listing_id text,
  item_id uuid,
  buyer_phone text default '',
  seller_phone text default '',
  sender_phone text default '',
  message text not null,
  read_by_recipient boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists sender_id uuid;
alter table public.messages add column if not exists receiver_id uuid;
alter table public.messages add column if not exists listing_id text;
alter table public.messages add column if not exists sender_phone text default '';
alter table public.messages add column if not exists read_by_recipient boolean not null default false;
alter table public.messages alter column buyer_phone drop not null;
alter table public.messages alter column seller_phone drop not null;
alter table public.messages alter column item_id drop not null;

create index if not exists idx_messages_sender_receiver on public.messages (sender_id, receiver_id);
create index if not exists idx_messages_listing on public.messages (listing_id);
create index if not exists idx_messages_created_at on public.messages (created_at asc);

-- ============================================================================
-- 4. ORDERS, RATINGS, OFFERS, WISHLIST, ALERTS, NOTIFICATIONS, REPORTS, SHOPS, SERVICES, BOOKINGS, ADS
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  item_id text,
  item_title text not null,
  item_photo text default '',
  item_location text default '',
  buyer_id uuid,
  buyer_name text not null default '',
  buyer_phone text not null default '',
  buyer_email text default '',
  seller_id uuid,
  seller_name text not null default '',
  seller_phone text not null default '',
  product_price numeric not null default 0,
  delivery_fee numeric not null default 500,
  total_amount numeric not null default 0,
  admin_commission numeric not null default 0,
  admin_total_kept numeric not null default 0,
  seller_payout numeric not null default 0,
  delivery_address text default '',
  order_status text not null default 'paid_escrow',
  refund_reason text default '',
  refund_photo text default '',
  created_at timestamptz not null default now(),
  shipped_at timestamptz,
  confirmed_at timestamptz
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'seller',
  target_id text not null,
  item_id text default '',
  rater_id uuid,
  rater_phone text default '',
  rater_name text not null default 'Buyer',
  score integer not null check (score >= 1 and score <= 5),
  comment text default '',
  video_url text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  item_title text default '',
  item_price numeric default 0,
  buyer_id uuid,
  buyer_name text default '',
  buyer_phone text default '',
  seller_id uuid,
  seller_phone text default '',
  offered_price numeric not null,
  counter_price numeric,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_phone text default '',
  item_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.want_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_phone text default '',
  keyword text not null,
  max_price numeric not null,
  institution text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  body text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  reporter_id uuid,
  reporter_phone text default '',
  reason text not null default '',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  owner_name text default '',
  owner_phone text unique,
  shop_name text not null,
  market text not null,
  shop_photo text default '',
  doc_photo text default '',
  rating numeric not null default 5.0,
  sales_count integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid,
  provider_phone text default '',
  provider_name text not null,
  profile_pic text default '',
  category text not null,
  title text not null,
  description text not null default '',
  price_from numeric not null default 0,
  location text not null default '',
  work_photos jsonb not null default '[]'::jsonb,
  offerings jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  rating numeric not null default 5.0,
  reviews_count integer not null default 0,
  is_advertised boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  provider_id uuid,
  provider_phone text default '',
  customer_id uuid,
  customer_phone text default '',
  customer_name text not null default '',
  service_name text not null,
  scheduled_day text not null,
  location text not null,
  notes text default '',
  price numeric not null default 0,
  status text not null default 'pending',
  reminder_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_settings (
  id text primary key default 'default',
  ads_enabled boolean not null default false,
  interstitial_enabled boolean not null default false,
  publisher_id text default '',
  banner_unit_id text default '',
  feed_unit_id text default '',
  interstitial_unit_id text default '',
  sidebar_unit_id text default '',
  google_ads_earnings numeric not null default 0,
  paystack_public_key text default '',
  paystack_split_code text default '',
  admin_subaccount_code text default ''
);

insert into public.ad_settings (id) values ('default') on conflict (id) do nothing;

create table if not exists public.account_block_logs (
  id uuid primary key default gen_random_uuid(),
  log_type text not null default 'Account Number Blocked',
  user_phone text default '',
  user_name text default '',
  item_id text default '',
  snippet text default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. RLS POLICIES FOR AUTHENTICATED CHAT & MARKETPLACE ACCESS
-- ============================================================================
alter table public.messages enable row level security;

drop policy if exists "Authenticated users can read their own messages" on public.messages;
create policy "Authenticated users can read their own messages"
  on public.messages
  for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Authenticated users can insert their own messages" on public.messages;
create policy "Authenticated users can insert their own messages"
  on public.messages
  for insert
  to authenticated
  with check (auth.uid() = sender_id);

drop policy if exists "Authenticated users can update read status on received messages" on public.messages;
create policy "Authenticated users can update read status on received messages"
  on public.messages
  for update
  to authenticated
  using (auth.uid() = receiver_id);

-- Keep marketplace catalog & user/order tables accessible cleanly via Supabase client
alter table public.profiles enable row level security;
drop policy if exists "Public profiles readable by everyone" on public.profiles;
create policy "Public profiles readable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update own profile or owner can moderate" on public.profiles;
create policy "Users can update own profile or owner can moderate" on public.profiles for update to authenticated
  using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

alter table public.users disable row level security;
alter table public.items disable row level security;
alter table public.orders disable row level security;
alter table public.ratings disable row level security;
alter table public.offers disable row level security;
alter table public.wishlist disable row level security;
alter table public.want_alerts disable row level security;
alter table public.notifications disable row level security;
alter table public.reports disable row level security;
alter table public.shops disable row level security;
alter table public.services disable row level security;
alter table public.bookings disable row level security;
alter table public.ad_settings disable row level security;
alter table public.account_block_logs disable row level security;

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  owner_name text default '',
  business_name text default 'JOKIPEKI GROUP',
  role text not null default 'owner'
);
alter table public.owners disable row level security;

-- ============================================================================
-- 6. ENABLE SUPABASE REALTIME FOR LIVE CHAT & NOTIFICATIONS
-- ============================================================================
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- 7. OWNER ROLE SETUP EXAMPLE (Run in Supabase Dashboard -> SQL Editor)
-- ============================================================================
-- update auth.users
--   set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"owner"')
-- where email = 'your-owner-email@example.com';
--
-- update public.owners
--   set role = 'owner'
-- where email = 'your-owner-email@example.com';
--
-- update public.profiles
--   set role = 'owner', business_name = 'JOKIPEKI GROUP'
-- where email = 'your-owner-email@example.com';
