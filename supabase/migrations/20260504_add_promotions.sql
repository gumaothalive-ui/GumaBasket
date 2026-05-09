-- Migration: Add promotions support to products table
-- Run this in the Supabase SQL editor or via supabase db push

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_on_sale    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);

-- Index for fast deals page queries
CREATE INDEX IF NOT EXISTS idx_products_is_on_sale ON products (is_on_sale) WHERE is_on_sale = TRUE;

-- Example: mark a product as on sale manually
-- UPDATE products SET is_on_sale = TRUE, original_price = premium_price, premium_price = premium_price * 0.80 WHERE id = '<your-product-id>';
