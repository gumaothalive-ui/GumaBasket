import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/store-status?vendor=Unity+cash+and+carry
 * Returns whether the store is currently open or closed based on
 * the seller's configured opening_time and closing_time (Africa/Johannesburg timezone).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const vendor = url.searchParams.get('vendor') || 'Unity cash and carry';

  const { data, error } = await supabase
    .from('sellers')
    .select('opening_time, closing_time, business_name')
    .eq('business_name', vendor)
    .single();

  if (error || !data || !data.opening_time || !data.closing_time) {
    // If no hours configured, assume always open
    return NextResponse.json({ isOpen: true, openingTime: '08:00', closingTime: '18:00' });
  }

  // Check time in South African timezone (UTC+2)
  const now = new Date();
  const zaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const currentMinutes = zaNow.getHours() * 60 + zaNow.getMinutes();

  const [openH, openM] = (data.opening_time as string).split(':').map(Number);
  const [closeH, closeM] = (data.closing_time as string).split(':').map(Number);
  const openMinutes  = openH  * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return NextResponse.json({
    isOpen,
    openingTime: data.opening_time,
    closingTime: data.closing_time,
    vendorName: data.business_name,
  });
}
