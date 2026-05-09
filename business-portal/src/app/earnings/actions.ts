'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export type SellerOrder = {
  id: string;
  order_ref: string;
  product_title: string;
  quantity: number;
  amount: number;
  customer_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
};

export type SellerPayout = {
  id: string;
  amount: number;
  status: 'processing' | 'paid';
  payout_date: string;
  reference: string | null;
  created_at: string;
};

export type WeeklyBreakdown = {
  week: string;
  range: string;
  orders: number;
  earnings: number;
  status: 'paid' | 'pending';
};

function getWeekKey(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().split('T')[0];
}

function formatDateRange(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export async function getEarningsData(vendorName: string) {
  if (!vendorName) return { success: false, error: 'No vendor specified' };

  const sessionRaw = (await cookies()).get('vendor_session')?.value;
  const session = sessionRaw ? decodeURIComponent(sessionRaw) : null;
  if (!session || session !== vendorName) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  try {
    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('seller_orders')
      .select('*')
      .eq('vendor_name', vendorName)
      .order('created_at', { ascending: false });

    if (ordersError) {
      // Table doesn't exist yet — return demo shape
      if (ordersError.code === '42P01' || ordersError.message?.includes('does not exist')) {
        return { success: true, demo: true, orders: [], payouts: [], summary: demoSummary(), weekly: [] };
      }
      return { success: false, error: ordersError.message };
    }

    // Fetch payouts
    const { data: payouts } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('vendor_name', vendorName)
      .order('payout_date', { ascending: false });

    const completedOrders = (orders || []).filter(o => o.status === 'completed');
    const pendingOrders = (orders || []).filter(o => o.status === 'pending');

    const totalPaid = (payouts || []).filter(p => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);
    const availableBalance = completedOrders.reduce((a, o) => a + Number(o.amount), 0) - totalPaid;
    const pendingEarnings = pendingOrders.reduce((a, o) => a + Number(o.amount), 0);

    // Next payout date (next Monday)
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextPayout = new Date(today);
    nextPayout.setDate(today.getDate() + daysUntilMonday);

    // Weekly breakdown from orders
    const weekMap: Record<string, { orders: number; earnings: number }> = {};
    (orders || []).filter(o => o.status !== 'cancelled').forEach(o => {
      const key = getWeekKey(new Date(o.created_at));
      if (!weekMap[key]) weekMap[key] = { orders: 0, earnings: 0 };
      weekMap[key].orders++;
      if (o.status === 'completed') weekMap[key].earnings += Number(o.amount);
    });

    const paidWeeks = new Set(
      (payouts || []).filter(p => p.status === 'paid').map(p => getWeekKey(new Date(p.payout_date)))
    );

    const weekly: WeeklyBreakdown[] = Object.entries(weekMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 8)
      .map(([week, data]) => ({
        week,
        range: formatDateRange(week),
        orders: data.orders,
        earnings: data.earnings,
        status: paidWeeks.has(week) ? 'paid' : 'pending',
      }));

    return {
      success: true,
      demo: false,
      orders: (orders || []).slice(0, 20) as SellerOrder[],
      payouts: (payouts || []).slice(0, 10) as SellerPayout[],
      weekly,
      summary: {
        availableBalance: Math.max(0, availableBalance),
        pendingEarnings,
        nextPayoutDate: nextPayout.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
        nextPayoutAmount: Math.max(0, availableBalance),
        totalEarned: completedOrders.reduce((a, o) => a + Number(o.amount), 0),
        totalOrders: (orders || []).length,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function demoSummary() {
  return {
    availableBalance: 0,
    pendingEarnings: 0,
    nextPayoutDate: getNextMonday(),
    nextPayoutAmount: 0,
    totalEarned: 0,
    totalOrders: 0,
  };
}

function getNextMonday() {
  const today = new Date();
  const daysUntil = (8 - today.getDay()) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}
