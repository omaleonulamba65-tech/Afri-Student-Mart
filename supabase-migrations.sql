-- Afri Student Mart — Complete Supabase Schema, Storage & Realtime Migration (NO RLS)
-- Owned by JOKEY PERKY GROUP
-- Run this SQL in Supabase Dashboard -> SQL Editor (idempotent / safe to re-run)

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE (public.users — Auth-linked user profiles)
-- ============================================================================
create table if not exists public.users (
  id uuid primary key,
  name text not null default '',
  full_name text not null default '',
  email text unique,
  phone text default '',
  phone_number text default '',
  country_code text default '+234',
  country text default 'Nigeria',
  state_city text default '',
  state text default '',
  language_of_preference text default 'English',
  language text default 'English',
  user_type text not null default 'Student', -- 'Student' | 'Trader' | 'Service Provider'
  account_type text not null default 'student', -- 'student' | 'trader' | 'service_provider'
  role text not null default 'buyer', -- 'buyer' | 'seller' | 'owner'
  business_name text not null default '',
  badges jsonb not null default '["student"]'::jsonb,
  institution text default '',
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
  password text default '',
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists name text not null default '';
alter table public.users add column if not exists full_name text not null default '';
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text default '';
alter table public.users add column if not exists phone_number text default '';
alter table public.users add column if not exists country_code text default '+234';
alter table public.users add column if not exists country text default 'Nigeria';
alter table public.users add column if not exists state_city text default '';
alter table public.users add column if not exists state text default '';
alter table public.users add column if not exists language_of_preference text default 'English';
alter table public.users add column if not exists language text default 'English';
alter table public.users add column if not exists user_type text not null default 'Student';
alter table public.users add column if not exists account_type text not null default 'student';
alter table public.users add column if not exists role text not null default 'buyer';
alter table public.users add column if not exists business_name text not null default '';
alter table public.users add column if not exists badges jsonb not null default '["student"]'::jsonb;
alter table public.users add column if not exists institution text default '';
alter table public.users add column if not exists campus text default '';
alter table public.users add column if not exists level text default '';
alter table public.users add column if not exists shop_name text default '';
alter table public.users add column if not exists market text default '';
alter table public.users add column if not exists service_category text default '';
alter table public.users add column if not exists price_from numeric default 0;
alter table public.users add column if not exists id_doc_type text default '';
alter table public.users add column if not exists id_doc_number text default '';
alter table public.users add column if not exists business_reg_type text default '';
alter table public.users add column if not exists business_reg_number text default '';
alter table public.users add column if not exists secondary_reg_number text default '';
alter table public.users add column if not exists payout_bank_name text default '';
alter table public.users add column if not exists payout_account_number text default '';
alter table public.users add column if not exists payout_account_name text default '';
alter table public.users add column if not exists profile_pic text default '';
alter table public.users add column if not exists trust_score numeric default 5.0;
alter table public.users add column if not exists reviews_count integer default 0;
alter table public.users add column if not exists blocked boolean not null default false;
alter table public.users add column if not exists block_count integer not null default 0;
alter table public.users add column if not exists password text default '';
alter table public.users add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.users alter column password drop not null;
  alter table public.users alter column password set default '';
exception when others then null;
end $$;

-- Keep legacy profiles table compatible if referenced
create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null default '',
  business_name text not null default '',
  email text,
  phone_number text,
  country_code text default '+234',
  country text default 'Nigeria',
  language text default 'English',
  role text not null default 'buyer',
  account_type text not null default 'student',
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
-- 2. SHOPS TABLE (public.shops)
-- ============================================================================
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  owner_name text default '',
  owner_phone text default '',
  shop_name text not null,
  description text not null default '',
  country text not null default 'Nigeria',
  state_city text not null default '',
  market text not null default '',
  shop_photo text default '',
  doc_photo text default '',
  rating numeric not null default 5.0,
  sales_count integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.shops add column if not exists owner_id uuid;
alter table public.shops add column if not exists owner_name text default '';
alter table public.shops add column if not exists owner_phone text default '';
alter table public.shops add column if not exists description text not null default '';
alter table public.shops add column if not exists country text not null default 'Nigeria';
alter table public.shops add column if not exists state_city text not null default '';
alter table public.shops add column if not exists market text not null default '';
alter table public.shops add column if not exists shop_photo text default '';
alter table public.shops add column if not exists doc_photo text default '';
alter table public.shops add column if not exists rating numeric not null default 5.0;
alter table public.shops add column if not exists sales_count integer not null default 0;
alter table public.shops add column if not exists is_featured boolean not null default false;
alter table public.shops add column if not exists created_at timestamptz not null default now();

-- ============================================================================
-- 3. PRODUCTS TABLE (public.products)
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id text default '',
  seller_id uuid,
  seller_name text default '',
  seller_phone text default '',
  seller_email text default '',
  title text not null default '',
  name text not null default '',
  category text not null default 'Clothes',
  price numeric not null default 0,
  condition text not null default 'Neatly Used',
  description text not null default '',
  image_url text default '',
  photos jsonb not null default '[]'::jsonb,
  thumbnails jsonb default '[]'::jsonb,
  video_url text default '',
  institution text default '',
  location text default '',
  state text default '',
  country text not null default 'Nigeria',
  country_code text default '+234',
  is_available boolean not null default true,
  make_offer boolean not null default true,
  pay_on_delivery boolean not null default true,
  is_featured boolean not null default false,
  is_boosted boolean not null default false,
  report_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists shop_id text default '';
alter table public.products add column if not exists seller_id uuid;
alter table public.products add column if not exists seller_name text default '';
alter table public.products add column if not exists seller_phone text default '';
alter table public.products add column if not exists seller_email text default '';
alter table public.products add column if not exists title text not null default '';
alter table public.products add column if not exists name text not null default '';
alter table public.products add column if not exists category text not null default 'Clothes';
alter table public.products add column if not exists price numeric not null default 0;
alter table public.products add column if not exists condition text not null default 'Neatly Used';
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists image_url text default '';
alter table public.products add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists thumbnails jsonb default '[]'::jsonb;
alter table public.products add column if not exists video_url text default '';
alter table public.products add column if not exists institution text default '';
alter table public.products add column if not exists location text default '';
alter table public.products add column if not exists state text default '';
alter table public.products add column if not exists country text not null default 'Nigeria';
alter table public.products add column if not exists country_code text default '+234';
alter table public.products add column if not exists is_available boolean not null default true;
alter table public.products add column if not exists make_offer boolean not null default true;
alter table public.products add column if not exists pay_on_delivery boolean not null default true;
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products add column if not exists is_boosted boolean not null default false;
alter table public.products add column if not exists report_count integer not null default 0;
alter table public.products add column if not exists status text not null default 'active';
alter table public.products add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.products alter column name drop not null;
  alter table public.products alter column title drop not null;
exception when others then null;
end $$;

-- Keep legacy items table compatible
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
  seller_phone text not null default '',
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

-- ============================================================================
-- 4. SERVICES TABLE (public.services)
-- ============================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid,
  provider_phone text default '',
  provider_name text not null default '',
  profile_pic text default '',
  category text not null,
  title text not null,
  description text not null default '',
  price numeric not null default 0,
  price_from numeric not null default 0,
  country text not null default 'Nigeria',
  state_city text not null default '',
  location text not null default '',
  work_photos jsonb not null default '[]'::jsonb,
  offerings jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  rating numeric not null default 5.0,
  reviews_count integer not null default 0,
  is_advertised boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.services add column if not exists provider_id uuid;
alter table public.services add column if not exists provider_phone text default '';
alter table public.services add column if not exists provider_name text not null default '';
alter table public.services add column if not exists profile_pic text default '';
alter table public.services add column if not exists price numeric not null default 0;
alter table public.services add column if not exists price_from numeric not null default 0;
alter table public.services add column if not exists country text not null default 'Nigeria';
alter table public.services add column if not exists state_city text not null default '';
alter table public.services add column if not exists location text not null default '';
alter table public.services add column if not exists work_photos jsonb not null default '[]'::jsonb;
alter table public.services add column if not exists offerings jsonb not null default '[]'::jsonb;
alter table public.services add column if not exists reviews jsonb not null default '[]'::jsonb;
alter table public.services add column if not exists rating numeric not null default 5.0;
alter table public.services add column if not exists reviews_count integer not null default 0;
alter table public.services add column if not exists is_advertised boolean not null default false;

-- ============================================================================
-- 5. ORDERS TABLE (public.orders)
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  product_id text default '',
  item_id text default '',
  item_title text not null default '',
  item_photo text default '',
  item_location text default '',
  buyer_id uuid,
  buyer_name text not null default '',
  buyer_phone text not null default '',
  buyer_email text default '',
  seller_id uuid,
  seller_name text not null default '',
  seller_phone text not null default '',
  seller_email text default '',
  quantity integer not null default 1,
  product_price numeric not null default 0,
  delivery_fee numeric not null default 0,
  total_price numeric not null default 0,
  total_amount numeric not null default 0,
  total numeric not null default 0,
  admin_commission numeric not null default 0,
  admin_total_kept numeric not null default 0,
  seller_payout numeric not null default 0,
  delivery_address text default '',
  country text not null default 'Nigeria',
  payment_method text not null default 'Bank Transfer',
  status text not null default 'pending', -- 'pending' | 'confirmed' | 'delivered'
  order_status text not null default 'paid_escrow',
  refund_reason text default '',
  refund_photo text default '',
  created_at timestamptz not null default now(),
  shipped_at timestamptz,
  confirmed_at timestamptz
);

alter table public.orders add column if not exists reference text;
alter table public.orders add column if not exists product_id text default '';
alter table public.orders add column if not exists item_id text default '';
alter table public.orders add column if not exists item_title text not null default '';
alter table public.orders add column if not exists item_photo text default '';
alter table public.orders add column if not exists item_location text default '';
alter table public.orders add column if not exists buyer_id uuid;
alter table public.orders add column if not exists buyer_name text not null default '';
alter table public.orders add column if not exists buyer_phone text not null default '';
alter table public.orders add column if not exists buyer_email text default '';
alter table public.orders add column if not exists seller_id uuid;
alter table public.orders add column if not exists seller_name text not null default '';
alter table public.orders add column if not exists seller_phone text not null default '';
alter table public.orders add column if not exists seller_email text default '';
alter table public.orders add column if not exists quantity integer not null default 1;
alter table public.orders add column if not exists product_price numeric not null default 0;
alter table public.orders add column if not exists delivery_fee numeric not null default 0;
alter table public.orders add column if not exists total_price numeric not null default 0;
alter table public.orders add column if not exists total_amount numeric not null default 0;
alter table public.orders add column if not exists total numeric not null default 0;
alter table public.orders add column if not exists admin_commission numeric not null default 0;
alter table public.orders add column if not exists admin_total_kept numeric not null default 0;
alter table public.orders add column if not exists seller_payout numeric not null default 0;
alter table public.orders add column if not exists delivery_address text default '';
alter table public.orders add column if not exists country text not null default 'Nigeria';
alter table public.orders add column if not exists payment_method text not null default 'Bank Transfer';
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists order_status text not null default 'paid_escrow';
alter table public.orders add column if not exists refund_reason text default '';
alter table public.orders add column if not exists refund_photo text default '';
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists confirmed_at timestamptz;

do $$ begin
  alter table public.orders alter column total drop not null;
  alter table public.orders alter column reference drop not null;
exception when others then null;
end $$;

-- ============================================================================
-- 6. PAYMENTS TABLE (public.payments)
-- ============================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null default '',
  payer_id uuid,
  amount numeric not null default 0,
  payment_method text not null default 'Bank Transfer', -- 'Bank Transfer' | 'Card' | 'Mobile Money'
  status text not null default 'pending', -- 'pending' | 'successful' | 'failed'
  buyer_email text default '',
  buyer_name text default '',
  seller_email text default '',
  seller_name text default '',
  product_name text default '',
  commission numeric default 0,
  seller_amount numeric default 0,
  paystack_reference text default '',
  created_at timestamptz not null default now()
);

alter table public.payments add column if not exists order_id text not null default '';
alter table public.payments add column if not exists payer_id uuid;
alter table public.payments add column if not exists amount numeric not null default 0;
alter table public.payments add column if not exists payment_method text not null default 'Bank Transfer';
alter table public.payments add column if not exists status text not null default 'pending';
alter table public.payments add column if not exists buyer_email text default '';
alter table public.payments add column if not exists buyer_name text default '';
alter table public.payments add column if not exists seller_email text default '';
alter table public.payments add column if not exists seller_name text default '';
alter table public.payments add column if not exists product_name text default '';
alter table public.payments add column if not exists commission numeric default 0;
alter table public.payments add column if not exists seller_amount numeric default 0;
alter table public.payments add column if not exists paystack_reference text default '';
alter table public.payments add column if not exists created_at timestamptz not null default now();

-- ============================================================================
-- 7. LIVE VIDEOS TABLE (public.live_videos)
-- ============================================================================
create table if not exists public.live_videos (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid,
  seller_name text not null default '',
  seller_phone text default '',
  shop_id text default '',
  shop_name text default '',
  title text not null,
  description text default '',
  video_url text not null default '',
  thumbnail_url text default '',
  country text not null default 'Nigeria',
  is_live boolean not null default true,
  viewers_count integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.live_videos add column if not exists seller_id uuid;
alter table public.live_videos add column if not exists seller_name text not null default '';
alter table public.live_videos add column if not exists seller_phone text default '';
alter table public.live_videos add column if not exists shop_id text default '';
alter table public.live_videos add column if not exists shop_name text default '';
alter table public.live_videos add column if not exists description text default '';
alter table public.live_videos add column if not exists thumbnail_url text default '';
alter table public.live_videos add column if not exists country text not null default 'Nigeria';
alter table public.live_videos add column if not exists is_live boolean not null default true;
alter table public.live_videos add column if not exists viewers_count integer not null default 0;
alter table public.live_videos add column if not exists ended_at timestamptz;

-- ============================================================================
-- 8. REVIEWS TABLE (public.reviews)
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid,
  reviewer_name text not null default 'Buyer',
  rater_phone text default '',
  product_id text not null default '',
  target_type text not null default 'product',
  target_id text not null default '',
  rating integer check (rating >= 1 and rating <= 5),
  stars integer check (stars >= 1 and stars <= 5),
  comment text default '',
  video_url text default '',
  created_at timestamptz not null default now()
);

alter table public.reviews add column if not exists reviewer_id uuid;
alter table public.reviews add column if not exists reviewer_name text not null default 'Buyer';
alter table public.reviews add column if not exists rater_phone text default '';
alter table public.reviews add column if not exists product_id text not null default '';
alter table public.reviews add column if not exists target_type text not null default 'product';
alter table public.reviews add column if not exists target_id text not null default '';
alter table public.reviews add column if not exists rating integer;
alter table public.reviews add column if not exists stars integer;
alter table public.reviews add column if not exists comment text default '';
alter table public.reviews add column if not exists video_url text default '';
alter table public.reviews add column if not exists created_at timestamptz not null default now();

-- ============================================================================
-- 9. MESSAGES, RATINGS, OFFERS, WISHLIST, WANT ALERTS, NOTIFICATIONS, REPORTS, BOOKINGS, SETTINGS, OWNERS
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
do $$ begin
  alter table public.messages alter column buyer_phone drop not null;
  alter table public.messages alter column seller_phone drop not null;
  alter table public.messages alter column item_id drop not null;
exception when others then null;
end $$;

create index if not exists idx_messages_sender_receiver on public.messages (sender_id, receiver_id);
create index if not exists idx_messages_listing on public.messages (listing_id);
create index if not exists idx_messages_created_at on public.messages (created_at asc);

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
  user_email text default '',
  title text not null default '',
  body text not null default '',
  message text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists user_email text default '';
alter table public.notifications add column if not exists title text not null default '';
alter table public.notifications add column if not exists body text not null default '';
alter table public.notifications add column if not exists message text not null default '';
alter table public.notifications add column if not exists type text not null default 'info';
alter table public.notifications add column if not exists read boolean not null default false;
alter table public.notifications add column if not exists is_read boolean not null default false;

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
  admin_subaccount_code text default '',
  commission_percent numeric not null default 10,
  site_name text not null default 'Afri Student Mart',
  announcement text default '',
  announcement_enabled boolean not null default false
);

alter table public.ad_settings add column if not exists commission_percent numeric not null default 10;
alter table public.ad_settings add column if not exists site_name text not null default 'Afri Student Mart';
alter table public.ad_settings add column if not exists announcement text default '';
alter table public.ad_settings add column if not exists announcement_enabled boolean not null default false;

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

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  owner_name text default '',
  business_name text default 'JOKIPEKI GROUP',
  role text not null default 'owner'
);

-- ============================================================================
-- 10. STRICTLY DISABLE RLS ON ALL TABLES (NO RLS FOR BUILDING)
-- ============================================================================
drop policy if exists "Authenticated users can read their own messages" on public.messages;
drop policy if exists "Authenticated users can insert their own messages" on public.messages;
drop policy if exists "Authenticated users can update read status on received messages" on public.messages;
drop policy if exists "Public profiles readable by everyone" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile or owner can moderate" on public.profiles;

alter table public.users disable row level security;
alter table public.profiles disable row level security;
alter table public.shops disable row level security;
alter table public.products disable row level security;
alter table public.items disable row level security;
alter table public.services disable row level security;
alter table public.orders disable row level security;
alter table public.payments disable row level security;
alter table public.live_videos disable row level security;
alter table public.reviews disable row level security;
alter table public.messages disable row level security;
alter table public.ratings disable row level security;
alter table public.offers disable row level security;
alter table public.wishlist disable row level security;
alter table public.want_alerts disable row level security;
alter table public.notifications disable row level security;
alter table public.reports disable row level security;
alter table public.bookings disable row level security;
alter table public.ad_settings disable row level security;
alter table public.account_block_logs disable row level security;
alter table public.owners disable row level security;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- ============================================================================
-- 11. SUPABASE STORAGE BUCKET: product-images (Public read & open upload)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Anyone can upload product-images" on storage.objects;
create policy "Anyone can upload product-images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

drop policy if exists "Anyone can update product-images" on storage.objects;
create policy "Anyone can update product-images"
  on storage.objects for update
  using (bucket_id = 'product-images');

drop policy if exists "Anyone can delete product-images" on storage.objects;
create policy "Anyone can delete product-images"
  on storage.objects for delete
  using (bucket_id = 'product-images');

-- ============================================================================
-- 12. ENABLE SUPABASE REALTIME FOR LIVE CHAT, NOTIFICATIONS, ORDERS & LIVE VIDEO
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

do $$
begin
  alter publication supabase_realtime add table public.live_videos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;
