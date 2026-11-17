-- Afri Student Mart — Powered by JOKEY PERKY GROUP
-- Run this SQL in your Supabase Dashboard -> SQL Editor
-- Creates the 3 core tables (Users, Items, Messages) and disables RLS so your app can read and write using the Anon Key.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_number text unique not null,
  password text not null,
  role text not null default 'buyer',
  institution text not null,
  state text not null,
  campus text not null,
  profile_pic text default '',
  blocked boolean not null default false,
  block_count integer not null default 0,
  agreed_policies boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  price numeric not null,
  condition text not null,
  description text not null,
  photos jsonb not null default '[]'::jsonb,
  seller_phone text not null references public.users(phone_number) on delete cascade,
  institution text not null,
  location text not null,
  is_featured boolean not null default false,
  report_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_phone text not null references public.users(phone_number) on delete cascade,
  seller_phone text not null references public.users(phone_number) on delete cascade,
  sender_phone text,
  message text not null,
  read_by_recipient boolean not null default false,
  created_at timestamptz not null default now()
);

-- Disable RLS so the app can read and write with the Anon Key
alter table public.users disable row level security;
alter table public.items disable row level security;
alter table public.messages disable row level security;

create index if not exists idx_items_institution on public.items(institution);
create index if not exists idx_items_category on public.items(category);
create index if not exists idx_messages_item_id on public.messages(item_id);

-- Enable Realtime on messages for instant buyer-seller chat
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then
  null;
end $$;
