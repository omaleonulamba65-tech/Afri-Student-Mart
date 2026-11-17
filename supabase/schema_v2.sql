-- Afri Student Mart — Fast Indexed Supabase Schema (Additive Only — Preserves Existing Data)
-- Run this in Supabase Dashboard -> SQL Editor.

create extension if not exists "pgcrypto";

-- 1. Core Users Table (existing)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_number text unique not null,
  password text not null,
  role text not null default 'buyer',
  institution text not null default '',
  state text not null default '',
  campus text not null default '',
  profile_pic text default '',
  created_at timestamptz not null default now()
);

-- 2. Core Items Table (existing)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  price numeric not null,
  condition text not null default 'Neatly Used',
  description text not null,
  photos text not null default '[]',
  seller_phone text not null,
  institution text not null default '',
  location text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Core Messages Table (existing)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  buyer_phone text not null,
  seller_phone text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 4. Ratings Table (new: Trust Score + 5-sec Video Reviews)
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  target_type text not null, -- 'seller' | 'service' | 'shop'
  target_id text not null,
  item_id text default '',
  rater_phone text not null,
  rater_name text not null,
  score integer not null check (score >= 1 and score <= 5),
  comment text default '',
  video_url text default '',
  created_at timestamptz not null default now()
);

-- 5. Offers / Haggle Table (new: Accept / Reject / Counter)
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  buyer_phone text not null,
  seller_phone text not null,
  offered_price numeric not null,
  counter_price numeric,
  status text not null default 'pending', -- 'pending' | 'accepted' | 'rejected' | 'countered'
  created_at timestamptz not null default now()
);

-- 6. Wishlist Table (new)
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_phone text not null,
  item_id text not null,
  created_at timestamptz not null default now(),
  unique (user_phone, item_id)
);

-- 7. Want Alerts / Price Drop Alerts Table (new)
create table if not exists public.want_alerts (
  id uuid primary key default gen_random_uuid(),
  user_phone text not null,
  keyword text not null,
  max_price numeric not null,
  institution text default '',
  created_at timestamptz not null default now()
);

-- 8. Reports Table (new)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  reporter_phone text not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. Shops Table (new)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_phone text unique not null,
  shop_name text not null,
  market text not null,
  shop_photo text default '',
  doc_photo text default '',
  rating numeric not null default 5.0,
  sales_count integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- 10. Services, Bookings, Subscriptions & Direct Chats (new)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_phone text not null,
  provider_name text not null,
  category text not null,
  title text not null,
  description text not null default '',
  price_from numeric not null default 0,
  location text not null default '',
  work_photos text not null default '[]',
  rating numeric not null default 5.0,
  reviews_count integer not null default 0,
  is_advertised boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  provider_phone text not null,
  customer_phone text not null,
  customer_name text not null,
  service_name text not null,
  scheduled_day text not null,
  location text not null,
  notes text default '',
  price numeric not null default 0,
  status text not null default 'pending',
  reminder_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_phone text not null,
  user_name text not null,
  plan_name text not null,
  price numeric not null,
  pickup_day text not null,
  location text not null,
  next_reminder_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  buyer_phone text not null,
  seller_phone text not null,
  sender_phone text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- FAST SUPABASE INDEXES FOR SUB-2S SEARCH & PAGINATION
create index if not exists idx_users_phone on public.users (phone_number);
create index if not exists idx_users_institution on public.users (institution);

create index if not exists idx_items_created_at on public.items (created_at desc);
create index if not exists idx_items_price on public.items (price asc);
create index if not exists idx_items_institution on public.items (institution);
create index if not exists idx_items_category on public.items (category);
create index if not exists idx_items_seller_phone on public.items (seller_phone);
create index if not exists idx_items_search on public.items using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(institution, '') || ' ' || coalesce(location, '')));

create index if not exists idx_messages_item_buyer on public.messages (item_id, buyer_phone);
create index if not exists idx_messages_seller on public.messages (seller_phone);

create index if not exists idx_ratings_target on public.ratings (target_type, target_id);
create index if not exists idx_offers_item on public.offers (item_id, buyer_phone);
create index if not exists idx_wishlist_user on public.wishlist (user_phone);
create index if not exists idx_want_alerts_user on public.want_alerts (user_phone);
create index if not exists idx_reports_target on public.reports (target_type, target_id);
create index if not exists idx_shops_owner on public.shops (owner_phone);
create index if not exists idx_services_category on public.services (category);

-- Disable RLS so the app can read and write cleanly using the Publishable / Anon Key
alter table public.users disable row level security;
alter table public.items disable row level security;
alter table public.messages disable row level security;
alter table public.ratings disable row level security;
alter table public.offers disable row level security;
alter table public.wishlist disable row level security;
alter table public.want_alerts disable row level security;
alter table public.reports disable row level security;
alter table public.shops disable row level security;
alter table public.services disable row level security;
alter table public.bookings disable row level security;
alter table public.subscriptions disable row level security;
alter table public.chats disable row level security;
