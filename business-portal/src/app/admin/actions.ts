'use server';

import { createClient } from '@/utils/supabase/server';

export async function getAdminStats() {
  const supabase = createClient();

  try {
    // 1. Total Customers (from profiles)
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Total Orders
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // 3. Total Revenue (Sum of total_amount)
    const { data: revenueData, error: revError } = await supabase
      .from('orders')
      .select('total_amount');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // 4. Growth Data (Orders per day for the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Process growth data
    const growthMap: Record<string, number> = {};
    recentOrders?.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString();
      growthMap[date] = (growthMap[date] || 0) + (o.total_amount || 0);
    });

    const growthChart = Object.entries(growthMap).map(([date, amount]) => ({ date, amount }));

    return {
      success: true,
      stats: {
        users: userCount || 0,
        orders: orderCount || 0,
        revenue: totalRevenue,
        growth: growthChart
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
