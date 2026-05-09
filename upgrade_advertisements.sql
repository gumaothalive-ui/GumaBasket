-- Upgrade advertisements table with rich ad fields
-- Run this in the Supabase SQL editor

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_pct INTEGER,
  ADD COLUMN IF NOT EXISTS star_rating NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS benefit_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cta_url TEXT;
