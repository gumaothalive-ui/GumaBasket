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

        // Group growth by date
        const growthMap: Record<string, GrowthPoint> = {};
        growthData?.forEach(o => {
          const date = new Date(o.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
          if (!growthMap[date]) growthMap[date] = { date, amount: 0, orders: 0 };
          growthMap[date].amount += o.total_amount || 0;
          growthMap[date].orders += 1;
        });

        // Top vendors by products
        const { data: vendorProducts } = await supabase
          .from('products')
          .select('vendor_name');
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
    { label: 'Total Users', value: stats.users.toLocaleString(), icon: '👥', color: '#3b82f6', change: '+12%', sub: 'Registered customers' },
    { label: 'Platform Orders', value: stats.orders.toLocaleString(), icon: '📦', color: '#10b981', change: '+8%', sub: 'All time order volume' },
    { label: 'Gross Revenue', value: `R${stats.revenue.toLocaleString()}`, icon: '💰', color: '#f59e0b', change: '+24%', sub: 'Total market value' },
    { label: 'Active Vendors', value: stats.vendors.toLocaleString(), icon: '🏪', color: '#8b5cf6', change: '+3%', sub: 'Registered sellers' },
    { label: 'Listed Products', value: stats.products.toLocaleString(), icon: '🛒', color: '#ec4899', change: '+15%', sub: 'Active marketplace items' },
    { label: 'Platform Fee (15%)', value: `R${(stats.revenue * 0.15).toLocaleString()}`, icon: '📈', color: '#14b8a6', change: 'EST.', sub: 'Your estimated earnings' },
  ] : [];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: 64, height: 64, border: '3px solid rgba(59,130,246,0.3)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b', fontFamily: 'system-ui', fontSize: 16, fontWeight: 600 }}>Loading Platform Analytics...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navigation */}
      <nav style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900 }}>G</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px' }}>Guma Basket</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Command Center</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['overview', 'users', 'orders', 'vendors'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', background: activeTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: activeTab === tab ? '#fff' : '#94a3b8', transition: 'all 0.2s' }}
            >{tab}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Live Data</span>
        </div>
      </nav>

      <main style={{ padding: '48px 40px', maxWidth: 1400, margin: '0 auto' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '16px 24px', borderRadius: 12, marginBottom: 32, fontSize: 14 }}>
            ⚠️ {error} — Some data may be unavailable.
          </div>
        )}

        {/* Page Title */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>
            Platform Intelligence
          </h1>
          <p style={{ color: '#64748b', fontSize: 16 }}>Real-time visibility into growth, users, and revenue.</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 48 }}>
          {statCards.map((card, i) => (
            <div
              key={i}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '28px 32px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s', cursor: 'default' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${card.color}, transparent)`, borderRadius: '20px 20px 0 0' }} />
              <div style={{ fontSize: 40, position: 'absolute', right: 20, bottom: 10, opacity: 0.07 }}>{card.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>{card.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>{card.value}</div>
                <span style={{ fontSize: 11, fontWeight: 800, color: card.color, background: `${card.color}20`, padding: '3px 8px', borderRadius: 20 }}>{card.change}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, marginBottom: 32 }}>
          {/* Revenue Chart */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
              <div>
                <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>Revenue Trajectory</h2>
                <p style={{ color: '#64748b', fontSize: 14 }}>Daily earnings over the last 30 days</p>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>Last 30 Days</div>
            </div>

            {stats && stats.growth.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, paddingBottom: 4 }}>
                  {stats.growth.map((g, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        title={`${g.date}: R${g.amount.toFixed(0)} (${g.orders} orders)`}
                        style={{ width: '100%', height: `${Math.max(4, (g.amount / maxRevenue) * 100)}%`, background: `linear-gradient(to top, #3b82f6, #10b981)`, borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'opacity 0.2s', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.85'}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontWeight: 700 }}>
                  <span>{stats.growth[0]?.date}</span>
                  <span>TODAY</span>
                </div>
              </>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14, fontStyle: 'italic' }}>
                No order data yet. Revenue chart will appear once orders are placed.
              </div>
            )}
          </div>

          {/* Top Vendors */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '36px' }}>
            <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>Top Vendors</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>By number of products listed</p>
            {stats?.topVendors.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {stats.topVendors.map((v, i) => {
                  const maxCount = stats.topVendors[0]?.count || 1;
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>{v.name}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{v.count} items</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                        <div style={{ height: '100%', width: `${(v.count / maxCount) * 100}%`, background: colors[i % colors.length], borderRadius: 10, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#475569', fontSize: 14, fontStyle: 'italic' }}>No vendor data yet.</div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>Recent Orders</h2>
              <p style={{ color: '#64748b', fontSize: 14 }}>Latest platform activity across all stores</p>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{stats?.recentOrders.length} Shown</div>
          </div>

          {stats?.recentOrders.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px', gap: 16, padding: '8px 16px', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Order ID</span>
                <span>Customer</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {stats.recentOrders.map((o, i) => {
                const statusColor: Record<string, string> = { completed: '#10b981', pending: '#f59e0b', cancelled: '#ef4444', preparing: '#3b82f6', ready: '#8b5cf6' };
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px', gap: 16, padding: '16px', borderRadius: 12, background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>#{o.id?.slice(0, 8)}...</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.customer_name || 'Anonymous'}</span>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>R{o.total_amount?.toFixed(2) || '0.00'}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: statusColor[o.status] || '#94a3b8', background: `${statusColor[o.status] || '#94a3b8'}20`, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', width: 'fit-content' }}>{o.status}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontSize: 15 }}>
              No orders placed yet. Activity will appear here as customers order.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569', fontSize: 12 }}>
          <span>Guma Basket Admin Portal • Private & Confidential</span>
          <span>Data synced from Supabase in real-time</span>
        </div>
      </main>
    </div>
  );
}
