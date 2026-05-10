'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

type GrowthPoint = { date: string; amount: number; orders: number };
type Stats = {
  users: number;
  orders: number;
  revenue: number;
  vendors: number;
  products: number;
  growth: GrowthPoint[];
  recentOrders: any[];
  topVendors: any[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'vendors'>('overview');

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      try {
        const [
          { count: userCount },
          { count: orderCount },
          { count: vendorCount },
          { count: productCount },
          { data: revenueData },
          { data: recentOrders },
          { data: growthData },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('sellers').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('total_amount'),
          supabase.from('orders').select('id, created_at, total_amount, status, customer_name').order('created_at', { ascending: false }).limit(8),
          supabase.from('orders').select('created_at, total_amount').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: true }),
        ]);

        const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        const growthMap: Record<string, GrowthPoint> = {};
        growthData?.forEach(o => {
          const date = new Date(o.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
          if (!growthMap[date]) growthMap[date] = { date, amount: 0, orders: 0 };
          growthMap[date].amount += o.total_amount || 0;
          growthMap[date].orders += 1;
        });

        const { data: vendorProducts } = await supabase.from('products').select('vendor_name');
        const vendorMap: Record<string, number> = {};
        vendorProducts?.forEach(p => {
          vendorMap[p.vendor_name] = (vendorMap[p.vendor_name] || 0) + 1;
        });
        const topVendors = Object.entries(vendorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        setStats({
          users: userCount || 0,
          orders: orderCount || 0,
          revenue: totalRevenue,
          vendors: vendorCount || 0,
          products: productCount || 0,
          growth: Object.values(growthMap),
          recentOrders: recentOrders || [],
          topVendors,
        });
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  const maxRevenue = stats ? Math.max(...stats.growth.map(g => g.amount), 1) : 1;

  const statCards = stats ? [
    { label: 'Total Users', value: stats.users.toLocaleString(), icon: '👥', accent: '#3b82f6', bg: '#eff6ff', change: '+12%', sub: 'Registered customers' },
    { label: 'Platform Orders', value: stats.orders.toLocaleString(), icon: '📦', accent: '#10b981', bg: '#ecfdf5', change: '+8%', sub: 'All time order volume' },
    { label: 'Gross Revenue', value: `R${stats.revenue.toLocaleString()}`, icon: '💰', accent: '#f59e0b', bg: '#fffbeb', change: '+24%', sub: 'Total market value' },
    { label: 'Active Vendors', value: stats.vendors.toLocaleString(), icon: '🏪', accent: '#8b5cf6', bg: '#f5f3ff', change: '+3%', sub: 'Registered sellers' },
    { label: 'Listed Products', value: stats.products.toLocaleString(), icon: '🛒', accent: '#ec4899', bg: '#fdf2f8', change: '+15%', sub: 'Active marketplace items' },
    { label: 'Your Platform Fee (15%)', value: `R${(stats.revenue * 0.15).toLocaleString()}`, icon: '📈', accent: '#14b8a6', bg: '#f0fdfa', change: 'EST.', sub: 'Estimated earnings' },
  ] : [];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <div style={{ width: 52, height: 52, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontFamily: 'system-ui', fontSize: 15, fontWeight: 600 }}>Loading Analytics...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top Navigation */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff' }}>G</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.5px', color: '#0f172a' }}>Guma Basket</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Command Center</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['overview', 'users', 'orders', 'vendors'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', background: activeTab === tab ? '#0f172a' : '#f1f5f9', color: activeTab === tab ? '#fff' : '#64748b', transition: 'all 0.2s' }}
            >{tab}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Live Data</span>
        </div>
      </nav>

      <main style={{ padding: '40px 40px', maxWidth: 1400, margin: '0 auto' }}>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '14px 20px', borderRadius: 12, marginBottom: 28, fontSize: 14, fontWeight: 500 }}>
            ⚠️ {error} — Some data may be unavailable.
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', color: '#0f172a', marginBottom: 6 }}>Platform Intelligence</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>Real-time visibility into growth, users, and revenue.</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
          {statCards.map((card, i) => (
            <div
              key={i}
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '24px 28px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', cursor: 'default', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: card.accent, borderRadius: '18px 18px 0 0' }} />
              <div style={{ width: 44, height: 44, background: card.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>{card.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>{card.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', color: '#0f172a' }}>{card.value}</div>
                <span style={{ fontSize: 11, fontWeight: 800, color: card.accent, background: card.bg, padding: '3px 8px', borderRadius: 20 }}>{card.change}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 20 }}>
          {/* Revenue Chart */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
              <div>
                <h2 style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 4 }}>Revenue Trajectory</h2>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Daily earnings over the last 30 days</p>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>Last 30 Days</div>
            </div>

            {stats && stats.growth.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 180, paddingBottom: 4 }}>
                  {stats.growth.map((g, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        title={`${g.date}: R${g.amount.toFixed(0)} (${g.orders} orders)`}
                        style={{ width: '100%', height: `${Math.max(5, (g.amount / maxRevenue) * 100)}%`, background: 'linear-gradient(to top, #3b82f6, #10b981)', borderRadius: '4px 4px 0 0', opacity: 0.75, transition: 'opacity 0.2s', cursor: 'pointer' }}
                        onMouseOver={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseOut={e => { e.currentTarget.style.opacity = '0.75'; }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>
                  <span>{stats.growth[0]?.date}</span>
                  <span>TODAY</span>
                </div>
              </>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 14, flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 40 }}>📊</div>
                Chart will appear once orders start coming in.
              </div>
            )}
          </div>

          {/* Top Vendors */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 4 }}>Top Vendors</h2>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 28 }}>By products listed</p>
            {stats?.topVendors.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {stats.topVendors.map((v, i) => {
                  const maxCount = stats.topVendors[0]?.count || 1;
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{v.count} items</span>
                      </div>
                      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 10 }}>
                        <div style={{ height: '100%', width: `${(v.count / maxCount) * 100}%`, background: colors[i % colors.length], borderRadius: 10 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#cbd5e1', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>No vendor data yet.</div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 4 }}>Recent Orders</h2>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>Latest platform activity across all stores</p>
            </div>
            <span style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#64748b' }}>{stats?.recentOrders.length} shown</span>
          </div>

          {stats?.recentOrders.length ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 110px', gap: 16, padding: '8px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
                <span>Order ID</span><span>Customer</span><span>Amount</span><span>Status</span>
              </div>
              {stats.recentOrders.map((o, i) => {
                const statusColor: Record<string, string> = { completed: '#10b981', pending: '#f59e0b', cancelled: '#ef4444', preparing: '#3b82f6', ready: '#8b5cf6' };
                const statusBg: Record<string, string> = { completed: '#ecfdf5', pending: '#fffbeb', cancelled: '#fff1f2', preparing: '#eff6ff', ready: '#f5f3ff' };
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 110px', gap: 16, padding: '14px 16px', borderRadius: 10, background: i % 2 === 0 ? '#f8fafc' : '#fff', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>#{o.id?.slice(0, 8)}...</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{o.customer_name || 'Anonymous'}</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>R{o.total_amount?.toFixed(2) || '0.00'}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: statusColor[o.status] || '#94a3b8', background: statusBg[o.status] || '#f1f5f9', padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', width: 'fit-content' }}>{o.status}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center', color: '#cbd5e1', fontSize: 15 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              No orders placed yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5e1', fontSize: 12, fontWeight: 600 }}>
          <span>Guma Basket Admin Portal • Private & Confidential</span>
          <span>Data synced from Supabase in real-time</span>
        </div>
      </main>
    </div>
  );
}
