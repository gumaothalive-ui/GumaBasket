-- Migration: Add opening_time and closing_time to vendor_profiles
-- Run this in your Supabase SQL Editor

ALTER TABLE public.vendor_profiles 
ADD COLUMN IF NOT EXISTS opening_time TIME WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS closing_time TIME WITHOUT TIME ZONE;