'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchAds(vendorName: string) {
  const { data, error } = await supabase
    .from('advertisements')
    .select('*')
    .eq('seller_name', vendorName)
    .order('created_at', { ascending: false });
    
  if (error) {
    if (error.code === '42P01') {
      return { success: true, demo: true, ads: [] };
    }
    return { success: false, error: error.message };
  }
  return { success: true, ads: data };
}

export async function createAd(vendorName: string, payload: {
  title: string;
  tagline?: string;
  image_url: string;
  total_budget: number;
  product_name?: string;
  headline?: string;
  original_price?: number;
  sale_price?: number;
  discount_pct?: number;
  star_rating?: number;
  benefit_tags?: string[];
  cta_url?: string;
}) {
  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('business_name', vendorName)
    .single();

  const seller_id = seller ? seller.id : null;

  const { error } = await supabase
    .from('advertisements')
    .insert([{
      seller_id,
      seller_name: vendorName,
      title: payload.title,
      tagline: payload.tagline,
      image_url: payload.image_url,
      total_budget: payload.total_budget,
      product_name: payload.product_name,
      headline: payload.headline,
      original_price: payload.original_price || null,
      sale_price: payload.sale_price || null,
      discount_pct: payload.discount_pct || null,
      star_rating: payload.star_rating || null,
      benefit_tags: payload.benefit_tags || [],
      cta_url: payload.cta_url || null,
      status: 'active',
    }]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
