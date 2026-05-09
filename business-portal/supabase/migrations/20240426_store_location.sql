-- Migration to add store location columns to sellers table
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS location_link TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
