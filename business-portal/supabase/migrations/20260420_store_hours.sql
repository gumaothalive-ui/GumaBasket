-- Add store hours to sellers table
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS closing_time  TIME DEFAULT '18:00:00';
