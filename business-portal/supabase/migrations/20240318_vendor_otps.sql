-- Migration: Create vendor_otps table for email authentication
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.vendor_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_otps ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for OTP requests
CREATE POLICY "Allow public insert for otps" ON public.vendor_otps
    FOR INSERT WITH CHECK (true);

-- Allow public read so server actions can verify the OTP
CREATE POLICY "Allow public read for otp verification" ON public.vendor_otps
    FOR SELECT USING (true);
