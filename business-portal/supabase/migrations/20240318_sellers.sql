-- Migration: Create sellers table for password authentication
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    business_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for signup
CREATE POLICY "Allow public insert for sellers" ON public.sellers
    FOR INSERT WITH CHECK (true);

-- Allow public read so server actions can verify login
CREATE POLICY "Allow public read for sellers" ON public.sellers
    FOR SELECT USING (true);
