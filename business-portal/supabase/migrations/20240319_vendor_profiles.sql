-- Migration: Create vendor_profiles table for banking details
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    vendor_name TEXT,
    bank_name TEXT,
    branch_code TEXT,
    account_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for now (simplified for demo)
CREATE POLICY "Allow public insert for profiles" ON public.vendor_profiles
    FOR INSERT WITH CHECK (true);

-- Allow public read/update for demo
CREATE POLICY "Allow public select for profiles" ON public.vendor_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow public update for profiles" ON public.vendor_profiles
    FOR UPDATE USING (true);
