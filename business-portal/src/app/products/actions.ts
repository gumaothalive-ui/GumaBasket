'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function verifySeller(vendorName: string) {
  if (!vendorName) return { valid: false };
  
  // Security Fix: Prevent IDOR / param manipulation
  const sessionRaw = (await cookies()).get('vendor_session')?.value;
  const session = sessionRaw ? decodeURIComponent(sessionRaw) : null;
  if (!session || session !== vendorName) {
    return { valid: false };
  }

  const { data } = await supabase
    .from('sellers')
    .select('id')
    .eq('business_name', vendorName)
    .single();
  return { valid: !!data };
}

export async function getProducts(vendorName: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_name', vendorName)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message, products: [] };
  }

  return { success: true, products: data || [] };
}

export async function deleteProduct(id: string) {
  const sessionRaw = (await cookies()).get('vendor_session')?.value;
  const session = sessionRaw ? decodeURIComponent(sessionRaw) : null;
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('vendor_name', session); // Security: must be owner

  if (error) return { success: false, error: error.message };

  revalidatePath('/products');
  return { success: true };
}

export async function updateProductDetails(id: string, basePrice: number, stock: number) {
  const sessionRaw = (await cookies()).get('vendor_session')?.value;
  const session = sessionRaw ? decodeURIComponent(sessionRaw) : null;
  if (!session) return { success: false, error: 'Unauthorized' };

  const premiumPrice = Math.round(basePrice * 1.15 * 100) / 100;

  const { error } = await supabase
    .from('products')
    .update({ base_price: basePrice, premium_price: premiumPrice, stock_quantity: stock })
    .eq('id', id)
    .eq('vendor_name', session); // Ensure they own it

  if (error) return { success: false, error: error.message };

  revalidatePath('/products');
  return { success: true };
}
