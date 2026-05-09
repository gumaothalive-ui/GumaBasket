'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSellerOrders, updateOrderStatus } from './actions';
import { getSession } from '../login/actions';
import { useRouter } from 'next/navigation';
import type { SellerOrderRow } from './actions';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const NAV = [
  { href: '/products',  icon: '▤', label: 'Products' },
  { href: '/orders',    icon: '📦', label: 'Orders',   active: true },
  { href: '/hours',     icon: '🕐', label: 'Store Hours' },
  { href: '/earnings',  icon: '↗', label: 'Earnings' },
  { href: '/advertising', icon: '📢', label: 'Advertising' },
  { href: '/onboarding',icon: '+', label: 'New product' },
  { href: '/profile',   icon: '🏪', label: 'Store Profile & Settings' },
];

function fmt(n: number) {
  return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    completed:  { background: '#F0FFF4', color: '#166534', border: '1px solid #BBF7D0' },
    preparing:  { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
    ready:      { background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' },
    processing: { background: '#F5F5FF', color: '#3730A3', border: '1px solid #C7D2FE' },
    pending:    { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
    cancelled:  { background: '#FFF5F5', color: '#CC0000', border: '1px solid #FFD5D5' },
    delivered:  { background: '#F0F0F0', color: '#333333', border: '1px solid #EAEAEA' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{ ...s, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize', display: 'inline-block' }}>
      {status}
    </span>
  );
}

function OrdersContent() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  useEffect(() => {
    getSession().then((res) => {
      if (!res.success || !res.vendorName) {
        router.push('/login');
        return;
      }
      setVendorName(res.vendorName);
    });
  }, [router]);

  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'cancelled' | 'delivered'>('all');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [newOrderToast, setNewOrderToast] = useState<string | null>(null);
  const prevOrderCountRef = useRef<number>(0);

  useEffect(() => {
    if (!vendorName) { setLoading(false); return; }
    refreshOrders();

    // ── Supabase Realtime: instant new-order push notifications ──
    const channel = supabase
      .channel(`seller_orders:${vendorName}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seller_orders', filter: `vendor_name=eq.${vendorName}` },
        (payload) => {
          const newOrder = payload.new as SellerOrderRow;
          setOrders(prev => [newOrder, ...prev]);
          setNewOrderToast(`🛒 New order #${newOrder.order_ref}!`);
          // Play browser notification sound if possible
          try { new Audio('/sounds/order-ping.mp3').play().catch(() => {}); } catch {}
          setTimeout(() => setNewOrderToast(null), 6000);
        }
      )
      .subscribe();

    // Fallback 30s polling (in case realtime is unavailable)
    const interval = setInterval(() => refreshOrders(true), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [vendorName]);

  async function refreshOrders(silent = false) {
    if (!silent) setLoading(true);
    const res = await getSellerOrders(vendorName);
    if (!silent) setLoading(false);
    
    if (res.success) {
      if (res.demo) setIsDemo(true);
      if (res.orders) setOrders(res.orders);
    } else {
      setError(res.error || 'Failed to load orders');
    }
  }

  async function handleStatusChange(id: string, currentStatus: string, newStatus: string) {
    if (currentStatus === newStatus) return;
    if (!confirm(`Mark this order as ${newStatus}?`)) return;
    
    // optimistic UI
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    
    const res = await updateOrderStatus(id, newStatus);
    if (!res.success) {
      alert('Failed: ' + res.error);
      refreshOrders(); // revert
    }
  }

  function toggleCheck(orderId: string, itemIdx: number, totalItems: number, currentStatus: string) {
    if (currentStatus === 'completed' || currentStatus === 'delivered') return; // Immutable if already completed
    
    const key = `${orderId}-${itemIdx}`;
    setCheckedItems(prev => {
      const isNowChecked = !prev[key];
      const next = { ...prev, [key]: isNowChecked };
      
      let checkedCount = 0;
      for (let i = 0; i < totalItems; i++) {
        if (next[`${orderId}-${i}`]) checkedCount++;
      }
      
      // Auto-trigger completion check if all boxes are now ticked!
      if (checkedCount === totalItems && currentStatus !== 'completed') {
        setTimeout(() => handleStatusChange(orderId, currentStatus, 'completed'), 100);
      }
      
      return next;
    });
  }

  const filteredOrders = orders.filter(o => activeTab === 'all' ? true : o.status === activeTab);
  const totalRevenue = orders.filter(o => o.status === 'completed' || o.status === 'delivered').reduce((acc, o) => acc + o.amount, 0);

  return (
    <main style={{ minHeight: '100vh', background: '#F8F8F8', color: '#111', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* \u2500\u2500 Realtime New Order Toast \u2500\u2500 */}
      {newOrderToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0f172a', color: '#fff',
          padding: '16px 24px', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideIn 0.3s ease',
          maxWidth: 340,
        }}>
          <div style={{ fontSize: 28 }}>🔔</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{newOrderToast}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>A new customer order has arrived</div>
          </div>
          <button onClick={() => setNewOrderToast(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* \u2500\u2500 NAV \u2500\u2500 */}
      <div className="dashboard-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '36px', width: 'auto' }} />
        </Link>
        {vendorName && <div className="dashboard-header-brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F5F5F5', padding: '6px 14px', borderRadius: 20, border: '1px solid #EAEAEA' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
              {vendorName[0].toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{vendorName}</span>
            <span style={{ color: '#D0D0D0' }}>|</span>
            <button onClick={async () => {
              import('../login/actions').then(m => m.logout().then(() => window.location.href = '/login'));
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#999', textDecoration: 'none' }}>Sign out</button>
          </div>
        </div>}
      </div>

      <div className="dashboard-container">

        {/* ── SIDEBAR ── */}
        <aside className="dashboard-sidebar">
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C0C0C0', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 12 }}>Menu</div>
          {NAV.map(item => {
            const pendingCount = orders.filter(o => o.status === 'pending').length;
            const hasNotification = item.label === 'Orders' && pendingCount > 0;

            return (
              <Link key={item.href} href={item.href}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: '13px', fontWeight: item.active ? 700 : 500, background: item.active ? '#F0F0F0' : 'transparent', color: item.active ? '#111' : '#888', marginBottom: 4 }}>
                <span style={{ fontSize: '14px', fontWeight: 700, width: 18, textAlign: 'center', color: item.active ? '#111' : '#bbb' }}>{item.icon}</span>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                  <span>{item.label}</span>
                  {hasNotification && (
                    <span style={{ background: '#CC0000', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '10px' }}>
                      {pendingCount}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </aside>

        {/* ── MAIN ── */}
        <div className="dashboard-main">
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>

            {isDemo && (
              <div style={{ padding: '14px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, fontSize: '13px', color: '#92400E', fontWeight: 500, marginBottom: 28 }}>
                ⚠️ Database order tracking not yet set up. Please run <code style={{fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 4px', borderRadius: 4}}>20240321_seller_earnings.sql</code>.
              </div>
            )}
            {error && (
              <div style={{ padding: '14px 18px', background: '#FFF5F5', border: '1px solid #FFD5D5', borderRadius: 12, fontSize: '13px', color: '#CC0000', fontWeight: 500, marginBottom: 28 }}>
                ❌ {error}
              </div>
            )}

            {/* Header */}
            <div className="flex-between-responsive" style={{ marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.8px', color: '#111', marginBottom: 6 }}>Orders</h1>
                <p style={{ color: '#aaa', fontSize: '14px' }}>
                  {loading ? 'Refreshing orders...' : `Managing ${orders.length} lifetime orders.`}
                </p>
              </div>
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 12, padding: '12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Processed</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#111', letterSpacing: '-0.5px' }}>R {fmt(totalRevenue)}</span>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, borderBottom: '1px solid #EAEAEA', paddingBottom: 16 }}>
              {[
                { id: 'all', label: 'All orders' },
                { id: 'pending', label: 'Pending payment' },
                { id: 'completed', label: 'Completed & Paid' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    background: activeTab === tab.id ? '#111' : '#fff',
                    color: activeTab === tab.id ? '#fff' : '#555',
                    border: activeTab === tab.id ? '1px solid #111' : '1px solid #EAEAEA',
                    padding: '8px 16px', borderRadius: 20, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.15s'
                  }}>
                  {tab.label}
                   <span style={{ marginLeft: 6, opacity: 0.6, fontSize: '12px' }}>
                     ({orders.filter(o => tab.id === 'all' ? true : o.status === tab.id).length})
                   </span>
                </button>
              ))}
            </div>

            {/* Table */}
            {loading && orders.length === 0 ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Loading persistent order data...</div>
            ) : filteredOrders.length === 0 ? (
               <div style={{ background: '#fff', border: '1px dashed #E0E0E0', borderRadius: 16, padding: '80px 40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: 16 }}>📭</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111', marginBottom: 8 }}>No orders found</h3>
                  <p style={{ color: '#aaa', fontSize: '14px' }}>{activeTab === 'all' ? 'Orders placed by customers will automatically sync and appear here.' : `No orders matching status: ${activeTab}`}</p>
               </div>
            ) : (
              <div className="responsive-table" style={{ background: '#fff', borderRadius: 16, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F5F5F5', background: '#FAFAFA' }}>
                      {['Order ID', 'Date', 'Product', 'Amount', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '14px 24px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: i < filteredOrders.length - 1 ? '1px solid #F8F8F8' : 'none', transition: 'background 0.1s' }}>
                        <td data-label="Order ID" style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>{o.order_ref}</td>
                        <td data-label="Date" style={{ padding: '16px 24px', fontSize: '12px', color: '#888' }}>
                          <div style={{ fontWeight: 600, color: '#555', marginBottom: 2, textAlign: 'right' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '11px', textAlign: 'right' }}>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td data-label="Product" style={{ padding: '16px 24px', fontSize: '14px', color: '#333', fontWeight: 500, minWidth: 200, textAlign: 'left' }}>
                          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {o.product_title.split('), ').map((item, idx, arr) => {
                              const text = idx === arr.length - 1 ? item : item + ')';
                              const isActuallyChecked = o.status === 'completed' || o.status === 'delivered' || checkedItems[`${o.id}-${idx}`];
                              return (
                                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.3, opacity: isActuallyChecked ? 0.5 : 1, textDecoration: isActuallyChecked ? 'line-through' : 'none' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!isActuallyChecked}
                                    onChange={() => toggleCheck(o.id, idx, arr.length, o.status)}
                                    style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#111' }} 
                                  />
                                  <span style={{ fontWeight: 600 }}>{text}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </td>
                        <td data-label="Amount" style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 800, color: '#111', textAlign: 'right' }}>R {fmt(o.amount)}</td>
                        <td data-label="Status" style={{ padding: '16px 24px' }}>
                          <StatusPill status={o.status} />
                        </td>
                        <td data-label="Action" style={{ padding: '16px 24px' }}>
                          <div style={{ position: 'relative' }}>
                            <select 
                              value={o.status}
                              onChange={(e) => handleStatusChange(o.id, o.status, e.target.value)}
                              style={{ appearance: 'none', background: '#FAFAFA', border: '1px solid #EAEAEA', borderRadius: 8, padding: '6px 28px 6px 10px', fontSize: '12px', fontWeight: 700, color: '#555', cursor: 'pointer', outline: 'none' }}
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready for Pickup</option>
                              <option value="completed">Completed / Paid</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px' }}>▼</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link href={`/products`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🛍️</span>
          <span>Inventory</span>
        </Link>
        <Link href={`/orders`} className="mobile-nav-item active" style={{ position: 'relative' }}>
          <span className="mobile-nav-icon">📦</span>
          <span>Orders</span>
          {orders.filter(o => o.status === 'pending').length > 0 && (
             <span style={{ position: 'absolute', top: 2, right: '20%', background: '#CC0000', color: '#fff', fontSize: '9px', fontWeight: 900, padding: '1px 5px', borderRadius: 10, border: '2px solid #fff' }}>
                {orders.filter(o => o.status === 'pending').length}
             </span>
          )}
        </Link>
        <Link href={`/onboarding`} className="mobile-nav-item">
          <span className="mobile-nav-icon">➕</span>
          <span>List Item</span>
        </Link>
        <Link href={`/profile`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🏪</span>
          <span>Profile</span>
        </Link>
      </nav>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', color: '#aaa', fontFamily: 'sans-serif' }}>Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
