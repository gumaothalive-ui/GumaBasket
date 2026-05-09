-- Migration: Add payout account details to products table
-- Run this in your Supabase SQL Editor to support the new vendor onboarding

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS branch_code TEXT;
