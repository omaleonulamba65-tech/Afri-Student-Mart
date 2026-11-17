-- Afri Student Mart Supabase Schema & Migration Script
-- Safe to run multiple times (idempotent)

-- 1. Ensure unique constraint prevents duplicate product listings with same title, price & category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'items_unique_title_price_category'
  ) THEN
    ALTER TABLE public.items
      ADD CONSTRAINT items_unique_title_price_category UNIQUE (title, price, category);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add items_unique_title_price_category immediately (check existing duplicates first).';
END $$;

-- 2. Orders table for Paystack Escrow + Order Tracking
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  item_id uuid,
  item_title text NOT NULL,
  item_photo text DEFAULT '',
  item_location text DEFAULT '',
  buyer_id uuid,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_email text DEFAULT '',
  seller_id uuid,
  seller_name text NOT NULL,
  seller_phone text NOT NULL,
  product_price numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 1000,
  total_amount numeric NOT NULL DEFAULT 0,
  admin_commission numeric NOT NULL DEFAULT 0,
  admin_total_kept numeric NOT NULL DEFAULT 0,
  seller_payout numeric NOT NULL DEFAULT 0,
  delivery_address text DEFAULT '',
  order_status text NOT NULL DEFAULT 'paid_escrow',
  created_at timestamptz NOT NULL DEFAULT now(),
  shipped_at timestamptz,
  confirmed_at timestamptz
);

-- 3. Security Log for Account Number Sharing Prevention in Buyer-Seller Chat
CREATE TABLE IF NOT EXISTS public.account_block_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL DEFAULT 'Account Number Blocked',
  user_phone text NOT NULL,
  user_name text DEFAULT '',
  item_id text DEFAULT '',
  snippet text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
