/**
 * GUMA BASKET: Marketplace Service
 * 
 * This service manages the product feed for GUMA BASKET.
 * It is now strictly pulling from the application's own Supabase database
 * to ensure only real products added by the user/merchants are displayed.
 */

import { supabase } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';

export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  premium_price: number;
  unit: string;
  stock_quantity: number;
  image_url: string;
  supplier_id: string;
  vendor_name: string;
  rating: number;
  reviewCount: number;
  is_on_sale: boolean;
  original_price?: number;
}

/**
 * Price calculation logic for the marketplace context
 */
function calculateSmartPrice(basePrice: number): number {
  // Simple 15% markup for the marketplace
  return Math.round(basePrice * 1.15);
}

export async function fetchSAProducts(page = 1, pageSize = 400): Promise<MarketplaceProduct[]> {
  noStore();
  // 🚀 BUILD OPTIMIZATION: Skip fetching from DB during Next.js build phase
  const hasSecrets = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'));
  
  if (!hasSecrets) {
     console.log('[Marketplace] Build environment with no secrets detected. Returning empty list.');
     return [];
  }

  // 1. Fetch from local Supabase DB (Products added via Business Portal)
  try {
    console.log('[Marketplace] Fetching from Supabase products table...');
    const { data: dbData, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Marketplace] Supabase error:', error.message);
      return [];
    }

    if (dbData) {
      console.log(`[Marketplace] Found ${dbData.length} products in Supabase.`);
      return dbData.map(p => {
        const calculatedPremium = Number(p.premium_price) || calculateSmartPrice(Number(p.base_price));
        const finalPrice = calculatedPremium > 50 ? calculatedPremium + 5 : calculatedPremium;

        return {
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category || 'Other',
          base_price: Number(p.base_price),
          premium_price: finalPrice,
          unit: p.unit || 'Each',
          stock_quantity: Number(p.stock_quantity) || 0,
          image_url: p.image_url || '',
          supplier_id: p.supplier_id || 'local',
          vendor_name: p.vendor_name || 'GUMA BASKET Merchant',
          rating: Number(p.rating) || 4.5,
          reviewCount: Number(p.reviewCount) || 12,
          is_on_sale: Boolean(p.is_on_sale),
          original_price: p.original_price ? Number(p.original_price) : undefined,
        };
      });
    }
  } catch (err) {
    console.error('[Marketplace] Exception fetching local products:', err);
  }

  return [];
}

export async function fetchProductById(id: string): Promise<MarketplaceProduct | null> {
  noStore();
  // Fetch specific product by ID from Supabase
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const calculatedPremium = Number(data.premium_price) || calculateSmartPrice(Number(data.base_price));
    const finalPrice = calculatedPremium > 50 ? calculatedPremium + 5 : calculatedPremium;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category || 'Other',
      base_price: Number(data.base_price),
      premium_price: finalPrice,
      unit: data.unit || 'Each',
      stock_quantity: Number(data.stock_quantity) || 0,
      image_url: data.image_url,
      supplier_id: data.supplier_id,
      vendor_name: data.vendor_name,
      rating: Number(data.rating) || 4.5,
      reviewCount: Number(data.reviewCount) || 0
    };
  } catch (err) {
    return null;
  }
}

export interface MarketplaceSeller {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  logo?: string;
  link: string;
  is_closed?: boolean;
}

export async function fetchSellers(): Promise<MarketplaceSeller[]> {
  noStore();
  const hasSecrets = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'));
  if (!hasSecrets) return [];

  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
       console.error('[Marketplace] Error fetching sellers:', error);
       return [];
    }

    if (data) {
       // Also fetch logos from vendor_profiles (where business portal saves them)
       const { data: vendorProfiles } = await supabase
         .from('vendor_profiles')
         .select('vendor_name, logo_url');

       const logoMap = new Map<string, string>();
       if (vendorProfiles) {
         for (const vp of vendorProfiles) {
           if (vp.logo_url) logoMap.set(vp.vendor_name, vp.logo_url);
         }
       }

       return data.map(seller => {
         const sellerName = seller.business_name || 'Store';
         // Prefer vendor_profiles logo (uploaded via business portal), fallback to sellers table
         const logo = logoMap.get(sellerName) || seller.logo_url || undefined;
         
         // Calculate if closed based on SAST timezone
         let is_closed = false;
         if (seller.opening_time && seller.closing_time) {
           const now = new Date();
           const options = { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false } as const;
           // timeString will be "HH:MM" (e.g. "08:30")
           let timeString = now.toLocaleTimeString('en-US', options);
           // Handle the 24:xx edge case in some Node environments
           if (timeString.startsWith('24:')) {
             timeString = '00:' + timeString.split(':')[1];
           }
           
           const openHM = seller.opening_time.substring(0, 5);
           const closeHM = seller.closing_time.substring(0, 5);
           
           if (timeString < openHM || timeString > closeHM) {
             is_closed = true;
           }
         }

         return {
           id: seller.id,
           name: sellerName,
           subtitle: 'VERIFIED MERCHANT',
           image: seller.logo_url || '',
           logo,
           link: `/stores/${seller.id}`,
           is_closed
         };
       });
    }
  } catch (err) {
    console.error('[Marketplace] Exception fetching sellers:', err);
  }
  return [];
}

export async function fetchStoreById(storeId: string): Promise<MarketplaceSeller | null> {
  noStore();
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', storeId)
      .single();
    
    if (error || !data) return null;

    const storeName = data.business_name || 'Store';

    // Also check vendor_profiles for logo (uploaded via business portal)
    let logo = data.logo_url;
    try {
      const { data: vp } = await supabase
        .from('vendor_profiles')
        .select('logo_url')
        .eq('vendor_name', storeName)
        .single();
      if (vp?.logo_url) logo = vp.logo_url;
    } catch { /* vendor_profiles lookup is optional */ }
    
    // Calculate if closed based on SAST timezone
    let is_closed = false;
    if (data.opening_time && data.closing_time) {
      const now = new Date();
      const options = { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false } as const;
      // timeString will be "HH:MM" (e.g. "08:30")
      let timeString = now.toLocaleTimeString('en-US', options);
      // Handle the 24:xx edge case in some Node environments
      if (timeString.startsWith('24:')) {
        timeString = '00:' + timeString.split(':')[1];
      }
      
      const openHM = data.opening_time.substring(0, 5);
      const closeHM = data.closing_time.substring(0, 5);
      
      if (timeString < openHM || timeString > closeHM) {
        is_closed = true;
      }
    }

    return {
      id: data.id,
      name: storeName,
      subtitle: 'VERIFIED MERCHANT',
      image: data.logo_url || '',
      logo,
      link: `/stores/${data.id}`,
      is_closed
    };
  } catch (err) {
    return null;
  }
}

export async function fetchProductsByStoreId(storeId: string): Promise<MarketplaceProduct[]> {
  noStore();
  try {
    const seller = await fetchStoreById(storeId);
    if (!seller) return [];

    const { data: dbData, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_name', seller.name)
      .order('created_at', { ascending: false });

    if (error) return [];

    if (dbData) {
      return dbData.map(p => {
        const calculatedPremium = Number(p.premium_price) || calculateSmartPrice(Number(p.base_price));
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category || 'Other',
          base_price: Number(p.base_price),
          premium_price: calculatedPremium > 50 ? calculatedPremium + 5 : calculatedPremium,
          unit: p.unit || 'Each',
          stock_quantity: Number(p.stock_quantity) || 0,
          image_url: p.image_url || '',
          supplier_id: p.supplier_id || 'local',
          vendor_name: p.vendor_name || 'GUMA BASKET Merchant',
          rating: Number(p.rating) || 4.5,
          reviewCount: Number(p.reviewCount) || 12
        };
      });
    }
  } catch (err) {}
  return [];
}
