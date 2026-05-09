-- Migration: Create product-images bucket and set public policies
-- Run this in your Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Policy to allow anonymous/public to upload (Simplified for demo)
CREATE POLICY "Allow Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );
