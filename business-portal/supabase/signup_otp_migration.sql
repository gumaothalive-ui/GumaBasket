-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
-- 1. Create the signup_otps table (stores pending OTPs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signup_otps (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  otp         text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Allow the anon/service key to read/write this table
ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on signup_otps" ON public.signup_otps
  FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. DELETE all existing test/dev seller accounts
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.sellers;
