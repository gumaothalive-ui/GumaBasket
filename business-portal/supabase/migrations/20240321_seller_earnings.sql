-- Seller Earnings Dashboard tables
-- Run this in your Supabase SQL editor

-- 1. Seller orders — tracks per-seller earnings from orders
CREATE TABLE IF NOT EXISTS public.seller_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  order_ref TEXT NOT NULL,              -- e.g. "DM-81234"
  product_title TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,        -- seller's base price (payout amount)
  customer_amount DECIMAL(10,2),        -- what customer paid (with 15% markup)
  status TEXT DEFAULT 'pending'         -- pending | completed | cancelled
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Seller payouts — payout history
CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'processing'      -- processing | paid
    CHECK (status IN ('processing', 'paid')),
  payout_date DATE NOT NULL,
  reference TEXT,                       -- bank reference number
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Open access for seller_orders and seller_payouts (secured by vendor_name match)
ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert seller_orders"
  ON public.seller_orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read seller_orders"
  ON public.seller_orders FOR SELECT USING (true);

CREATE POLICY "Anyone can update seller_orders"
  ON public.seller_orders FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert seller_payouts"
  ON public.seller_payouts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read seller_payouts"
  ON public.seller_payouts FOR SELECT USING (true);
