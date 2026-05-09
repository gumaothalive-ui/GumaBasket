'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type SellerOrderRow = {
  id: string;
  order_ref: string;
  product_title: string;
  quantity: number;
  amount: number;
  customer_amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'delivered';
  created_at: string;
  completed_at: string | null;
};

export async function getSellerOrders(vendorName: string) {
  if (!vendorName) return { success: false, error: 'No vendor specified' };

  const sessionRaw = (await cookies()).get('vendor_session')?.value;
  const session = sessionRaw ? decodeURIComponent(sessionRaw) : null;
  if (!session || session !== vendorName) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  console.log('[Orders API] Fetching orders for vendor:', vendorName);

  try {
    const { data: orders, error } = await supabase
      .from('seller_orders')
      .select('*')
      .eq('vendor_name', vendorName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Orders API] Error fetching:', error);
      if (error.code === '42P01') {
        return { success: true, orders: [], demo: true }; // DB not setup yet
      }
      throw error;
    }
    
    console.log('[Orders API] Found', orders?.length, 'orders for vendor:', vendorName);
    return { success: true, orders: orders as SellerOrderRow[] };
  } catch (e: any) {
    console.error('[Orders API] Exception:', e);
    return { success: false, error: e.message };
  }
}

export async function updateOrderStatus(id: string, newStatus: string) {
  try {
    const sessionRaw = (await cookies()).get('vendor_session')?.value;
    const session = sessionRaw ? decodeURIComponent(sessionRaw) : null;
    if (!session) throw new Error('Unauthorized');

    // Make sure we only update orders belonging to this vendor
    const { data: orderOwner } = await supabase
      .from('seller_orders')
      .select('vendor_name')
      .eq('id', id)
      .single();
      
    if (orderOwner?.vendor_name !== session) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('seller_orders')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (error) throw error;
    revalidatePath('/orders');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
