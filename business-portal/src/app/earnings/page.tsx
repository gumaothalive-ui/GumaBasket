'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getEarningsData } from './actions';
import { getSession } from '../login/actions';
import { useRouter } from 'next/navigation';
import type { SellerOrder, SellerPayout, WeeklyBreakdown } from './actions';
import { Suspense } from 'react';

const NAV = [
  { href: '/products',  icon: '▤', label: 'Products'    },
  { href: '/earnings',  icon: '↗', label: 'Earnings', active: true },
  { href: '/advertising', icon: '📢', label: 'Advertising' },
  { href: '/onboarding',icon: '+', label: 'New product' },
  { href: '/profile',   icon: '🏪', label: 'Store Profile & Settings'    },
];

function fmt(n: number) {
  return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    paid:       { background: '#F0FFF4', color: '#166534', border: '1px solid #BBF7D0' },
    processing: { background: '#F5F5FF', color: '#3730A3', border: '1px solid #C7D2FE' },
    pending:    { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
    completed:  { background: '#F0FFF4', color: '#166534', border: '1px solid #BBF7D0' },
    cancelled:  { background: '#FFF5F5', color: '#CC0000', border: '1px solid #FFD5D5' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{ ...s, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', display: 'inline-block' }}>
      {status}
    </span>
  );
}

function EarningsContent() {
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

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorName) { setLoading(false); return; }
    getEarningsData(vendorName).then(res => { setData(res); setLoading(false); });
  }, [vendorName]);

  const summary = data?.summary;
  const orders: SellerOrder[] = data?.orders || [];
  const payouts: SellerPayout[] = data?.payouts || [];
  const weekly: WeeklyBreakdown[] = data?.weekly || [];
  const isEmpty = !loading && orders.length === 0;

  return (
    <main style={{ minHeight: '100vh', background: '#F8F8F8', color: '#111', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── NAV ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EAEAEA', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '36px', width: 'auto' }} />
        </Link>
        {vendorName && (
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
        )}
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #EAEAEA', padding: '28px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C0C0C0', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 12 }}>Menu</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: '13px', fontWeight: item.active ? 700 : 500, background: item.active ? '#F0F0F0' : 'transparent', color: item.active ? '#111' : '#888', marginBottom: 4 }}>
              <span style={{ fontSize: '14px', fontWeight: 700, width: 18, textAlign: 'center', color: item.active ? '#111' : '#bbb' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.8px', color: '#111', marginBottom: 4 }}>Earnings</h1>
              <p style={{ color: '#aaa', fontSize: '14px' }}>Track your sales, balances, and payout history.</p>
            </div>

            {/* Setup notice if table missing */}
            {data?.demo && (
              <div style={{ padding: '14px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, fontSize: '13px', color: '#92400E', fontWeight: 500, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>⚠️</span>
                <span>Earnings tables not yet created. Run <code style={{ background: '#FEF9C3', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700 }}>20240321_seller_earnings.sql</code> in your Supabase SQL editor to enable this page.</span>
              </div>
            )}

            {/* ── SUMMARY CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              {/* Available balance */}
              <div style={{ background: '#111', borderRadius: 16, padding: '28px 24px', color: '#fff' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Available balance</div>
                <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>
                  R {loading ? '—' : fmt(summary?.availableBalance || 0)}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {summary?.availableBalance > 0 ? 'Ready for payout' : 'No balance yet'}
                </div>
                {summary?.availableBalance > 0 && (
                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 12px', fontSize: '11px', fontWeight: 700, color: '#ddd' }}>
                    ✓ Payout scheduled
                  </div>
                )}
              </div>

              {/* Pending earnings */}
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, padding: '28px 24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Pending earnings</div>
                <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', color: '#111', marginBottom: 8 }}>
                  R {loading ? '—' : fmt(summary?.pendingEarnings || 0)}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>From orders in progress</div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A017' }} />
                  <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 600 }}>Moves to balance on delivery</span>
                </div>
              </div>

              {/* Next payout */}
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, padding: '28px 24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Next payout</div>
                <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#111', marginBottom: 6 }}>
                  R {loading ? '—' : fmt(summary?.nextPayoutAmount || 0)}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: 12 }}>
                  {summary?.nextPayoutDate || '—'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', background: '#F5F5F5', borderRadius: 8, padding: '6px 10px' }}>
                  📅 Bi-weekly EFT payout
                </div>
              </div>
            </div>

            {/* ── MONEY FLOW INDICATOR ── */}
            <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, padding: '24px 28px', marginBottom: 32 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>How your money moves</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {[
                  { label: 'Order placed', icon: '🛒', desc: 'Customer pays', color: '#F5F5F5', border: '#E0E0E0' },
                  { label: 'Order completed', icon: '✓', desc: 'Delivery confirmed', color: '#F5F5F5', border: '#E0E0E0' },
                  { label: 'Balance', icon: '⚖', desc: 'Funds available', color: '#F0F0F0', border: '#D0D0D0' },
                  { label: 'EFT payout', icon: '🏦', desc: 'Sent to your bank', color: '#111', border: '#111', dark: true },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ flex: 1, background: step.color, border: `1px solid ${step.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', marginBottom: 6 }}>{step.icon}</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: step.dark ? '#fff' : '#111', marginBottom: 2 }}>{step.label}</div>
                      <div style={{ fontSize: '10px', color: step.dark ? '#aaa' : '#999' }}>{step.desc}</div>
                    </div>
                    {i < 3 && (
                      <div style={{ padding: '0 8px', color: '#D0D0D0', fontSize: '18px', flexShrink: 0 }}>›</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── REVENUE BAR CHART ── */}
            {!isEmpty && weekly.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, padding: '28px', marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>Revenue Chart</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Weekly earnings (ZAR)</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#05a357', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: 20 }}>
                    ↑ Live Data
                  </div>
                </div>
                {(() => {
                  const maxVal = Math.max(...weekly.map(w => w.earnings), 1);
                  const chartHeight = 140;
                  const barW = 40;
                  const gap = 24;
                  const totalW = weekly.length * (barW + gap);
                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <svg width={Math.max(totalW, 400)} height={chartHeight + 40} style={{ display: 'block' }}>
                        {weekly.map((w, i) => {
                          const h = Math.max((w.earnings / maxVal) * chartHeight, 4);
                          const x = i * (barW + gap);
                          const y = chartHeight - h;
                          return (
                            <g key={w.week}>
                              {/* Bar */}
                              <rect x={x} y={y} width={barW} height={h} rx={6} fill="#111" opacity={0.85 + (i / weekly.length) * 0.15} />
                              {/* Value label */}
                              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#333">
                                R{w.earnings.toFixed(0)}
                              </text>
                              {/* Week label */}
                              <text x={x + barW / 2} y={chartHeight + 18} textAnchor="middle" fontSize="10" fill="#999">
                                {w.range?.split(' ')[0] || `W${i + 1}`}
                              </text>
                              {/* Order count */}
                              <text x={x + barW / 2} y={chartHeight + 30} textAnchor="middle" fontSize="9" fill="#bbb">
                                {w.orders} orders
                              </text>
                            </g>
                          );
                        })}
                        {/* Baseline */}
                        <line x1={0} y1={chartHeight} x2={totalW} y2={chartHeight} stroke="#EAEAEA" strokeWidth={1} />
                      </svg>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── EMPTY STATE ── */}
            {isEmpty && (
              <div style={{ background: '#fff', border: '1px dashed #E0E0E0', borderRadius: 16, padding: '60px 40px', textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, background: '#F5F5F5', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>📊</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111', marginBottom: 8 }}>No earnings yet</h3>
                <p style={{ color: '#aaa', fontSize: '14px', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.7 }}>
                  Once customers start placing orders, your earnings will appear here. List your first product to get started.
                </p>
                <Link href={`/onboarding`}
                  style={{ background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '12px 24px', borderRadius: 10, fontSize: '14px' }}>
                  Add your first product →
                </Link>
              </div>
            )}

            {/* ── WEEKLY BREAKDOWN ── */}
            {weekly.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>Weekly breakdown</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: 2 }}>Earnings grouped by week</div>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F5F5F5' }}>
                      {['Week', 'Orders', 'Earnings', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 24px', textAlign: h === 'Earnings' ? 'right' : 'left', fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.map((w, i) => (
                      <tr key={w.week} style={{ borderBottom: i < weekly.length - 1 ? '1px solid #F8F8F8' : 'none' }}>
                        <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 600, color: '#333' }}>{w.range}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#888' }}>{w.orders} order{w.orders !== 1 ? 's' : ''}</td>
                        <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: 800, color: '#111', textAlign: 'right' }}>R {fmt(w.earnings)}</td>
                        <td style={{ padding: '14px 24px', textAlign: 'left' }}>
                          <StatusPill status={w.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── ORDERS TABLE ── */}
            {orders.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>Order earnings</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: 2 }}>Your most recent {orders.length} orders</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F5F5F5' }}>
                      {['Order', 'Product', 'Date', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 24px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid #F8F8F8' : 'none' }}>
                        <td style={{ padding: '13px 24px', fontSize: '12px', fontWeight: 700, color: '#555', fontFamily: 'monospace' }}>{o.order_ref}</td>
                        <td style={{ padding: '13px 24px', fontSize: '13px', color: '#333', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_title}</td>
                        <td style={{ padding: '13px 24px', fontSize: '12px', color: '#aaa' }}>
                          {new Date(o.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ padding: '13px 24px', fontSize: '14px', fontWeight: 800, color: '#111', textAlign: 'right' }}>R {fmt(o.amount)}</td>
                        <td style={{ padding: '13px 24px' }}>
                          <StatusPill status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PAYOUT HISTORY ── */}
            {payouts.length > 0 ? (
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>Payout history</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: 2 }}>All EFT payouts to your bank account</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F5F5F5' }}>
                      {['Date', 'Reference', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 24px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < payouts.length - 1 ? '1px solid #F8F8F8' : 'none' }}>
                        <td style={{ padding: '13px 24px', fontSize: '13px', color: '#333' }}>
                          {new Date(p.payout_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '13px 24px', fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }}>{p.reference || '—'}</td>
                        <td style={{ padding: '13px 24px', fontSize: '14px', fontWeight: 800, color: '#111', textAlign: 'right' }}>R {fmt(p.amount)}</td>
                        <td style={{ padding: '13px 24px' }}>
                          <StatusPill status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : orders.length > 0 ? (
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: 12 }}>📅</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: 4 }}>No payouts yet</p>
                <p style={{ fontSize: '13px', color: '#aaa' }}>Your first payout will be processed on your next scheduled date.</p>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </main>
  );
}

export default function EarningsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', color: '#aaa', fontFamily: 'sans-serif' }}>Loading earnings...</div>}>
      <EarningsContent />
    </Suspense>
  );
}
