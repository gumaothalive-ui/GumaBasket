-- Add phone number to sellers table so they can receive SMS order alerts
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS phone TEXT;
