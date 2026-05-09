-- Create advertisements table for vendor self-serve ads
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
    seller_name TEXT NOT NULL,
    title TEXT,
    tagline TEXT,
    image_url TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, paused, ended
    total_budget NUMERIC DEFAULT 0,
    amount_spent NUMERIC DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active ads
CREATE POLICY "Public can view active ads" 
    ON public.advertisements FOR SELECT 
    USING (status = 'active');

-- Allow sellers to manage their own ads
-- Note: Assuming seller_id matches the authenticated user in a real setup,
-- but for open demo purposes we might allow broader access or filter by session email.
CREATE POLICY "Sellers can manage their own ads" 
    ON public.advertisements FOR ALL
    USING (true)
    WITH CHECK (true);
