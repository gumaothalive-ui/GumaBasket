'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getSession } from '../login/actions';
import { saveBusinessHours, getBusinessHours } from '../profile/actions';

const NAV = [
  { href: '/products',  icon: '🛍️', label: 'Inventory' },
  { href: '/orders',    icon: '📦', label: 'Orders' },
  { href: '/onboarding',icon: '➕', label: 'List Item' },
  { href: '/hours',     icon: '🕐', label: 'Store Hours', active: true },
  { href: '/profile',   icon: '🏪', label: 'Store Profile & Settings' },
];

function fmt12(time24: string) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function StoreHoursContent() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | string>('idle');
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    getSession().then(res => {
      if (!res.success || !res.vendorName) { router.push('/login'); return; }
      setVendorName(res.vendorName);
      getBusinessHours(res.vendorName).then(h => {
        if (h.success && h.openingTime) {
          setOpeningTime(h.openingTime.slice(0, 5));
          setClosingTime((h.closingTime ?? '18:00').slice(0, 5));
        }
      });
    });
  }, [router]);

  // Re-check if store is currently open every minute
  useEffect(() => {
    function check() {
      const now = new Date();
      const [openH, openM] = openingTime.split(':').map(Number);
      const [closeH, closeM] = closingTime.split(':').map(Number);
      const cur = now.getHours() * 60 + now.getMinutes();
      const open = openH * 60 + openM;
      const close = closeH * 60 + closeM;
      setIsOpen(cur >= open && cur < close);
    }
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [openingTime, closingTime]);

  async function handleSave() {
    if (!vendorName) return;
    setIsSaving(true);
    setResult('idle');
    const res = await saveBusinessHours(vendorName, openingTime, closingTime);
    setIsSaving(false);
    if (res.success) setResult('success');
    else setResult('error:' + res.error);
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#fafafa', border: '1.5px solid #e8e8e8',
    borderRadius: 8, padding: '14px 18px', color: '#1a1a1a', fontSize: '20px',
    fontWeight: 700, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    textAlign: 'center' as const,
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div className="dashboard-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ background: '#0f172a', color: '#fff', fontWeight: 900, fontSize: '16px', padding: '3px 9px', borderRadius: 5 }}>DM</div>
          <span className="dashboard-header-brand-text" style={{ fontWeight: 800, fontSize: '15px', color: '#1a1a1a' }}>Seller Center</span>
        </Link>
        {vendorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f5f5f5', padding: '6px 14px', borderRadius: 20, border: '1px solid #e8e8e8' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
              {vendorName[0].toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{vendorName}</span>
          </div>
        )}
      </div>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 10 }}>Menu</div>
          {NAV.map(item => (
            <Link key={item.href} href={`${item.href}?vendor=${encodeURIComponent(vendorName)}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 8, textDecoration: 'none', fontSize: '14px', fontWeight: item.active ? 700 : 500, background: item.active ? '#f1f5f9' : 'transparent', color: item.active ? '#0f172a' : '#666', borderLeft: item.active ? '3px solid #0f172a' : '3px solid transparent', marginBottom: 2 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
            </Link>
          ))}
        </aside>

        {/* Main */}
        <div className="dashboard-main">
          <div style={{ maxWidth: 600, margin: '0 auto' }}>

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: '#1a1a1a', margin: '0 0 6px 0' }}>🕐 Store Hours</h1>
              <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                Set when your store is open. Orders placed while you&apos;re closed will be queued for the next morning.
              </p>
            </div>

            {/* Live Status Badge */}
            {isOpen !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isOpen ? '#f0fdf4' : '#fff8f0',
                border: `1.5px solid ${isOpen ? '#bbf7d0' : '#fed7aa'}`,
                borderRadius: 12, padding: '14px 20px', marginBottom: 28
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOpen ? '#22c55e' : '#f97316', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: isOpen ? '#15803d' : '#c2410c' }}>
                    {isOpen ? 'Store is currently OPEN' : 'Store is currently CLOSED'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: 2 }}>
                    {isOpen
                      ? `Closes at ${fmt12(closingTime)}`
                      : `Opens at ${fmt12(openingTime)} · Orders are queued for the morning`
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Time Pickers */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e8e8', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ background: '#0f172a', padding: '16px 24px', color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                Set Operating Hours
              </div>
              <div style={{ padding: '32px 28px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      🌅 Opening Time
                    </label>
                    <input
                      type="time"
                      value={openingTime}
                      onChange={e => setOpeningTime(e.target.value)}
                      style={inp}
                    />
                    <div style={{ textAlign: 'center', marginTop: 8, fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                      {fmt12(openingTime)}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      🌆 Closing Time
                    </label>
                    <input
                      type="time"
                      value={closingTime}
                      onChange={e => setClosingTime(e.target.value)}
                      style={inp}
                    />
                    <div style={{ textAlign: 'center', marginTop: 8, fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                      {fmt12(closingTime)}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', marginBottom: 24, textAlign: 'center', fontSize: '14px', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                  Open <strong>{fmt12(openingTime)}</strong> — <strong>{fmt12(closingTime)}</strong>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving || !vendorName}
                  style={{
                    width: '100%', background: isSaving ? '#94a3b8' : '#0f172a', color: '#fff',
                    border: 'none', borderRadius: 10, padding: '16px', fontWeight: 800,
                    fontSize: '15px', cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.2s'
                  }}
                >
                  {isSaving ? 'Saving...' : '💾 Save Store Hours'}
                </button>

                {result === 'success' && (
                  <div style={{ marginTop: 16, padding: '14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>
                    ✅ Store hours saved! Customers will now see your status.
                  </div>
                )}
                {typeof result === 'string' && result.startsWith('error:') && (
                  <div style={{ marginTop: 16, padding: '14px', borderRadius: 8, background: '#fff8f8', border: '1px solid #ffdcdc', color: '#e53e3e', fontSize: '13px' }}>
                    ⨯ {result.slice(6)}
                  </div>
                )}
              </div>
            </div>

            {/* Info card */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', fontSize: '13px', color: '#1d4ed8' }}>
              <strong>ℹ️ How it works:</strong> When your store is closed, customers can still browse and place orders normally.
              Their orders will be marked as <em>queued</em> and a message will appear on the storefront letting them know
              their order will be fulfilled when you open in the morning.
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <Link href={`/products?vendor=${encodeURIComponent(vendorName)}`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🛍️</span><span>Inventory</span>
        </Link>
        <Link href={`/orders?vendor=${encodeURIComponent(vendorName)}`} className="mobile-nav-item">
          <span className="mobile-nav-icon">📦</span><span>Orders</span>
        </Link>
        <Link href={`/hours?vendor=${encodeURIComponent(vendorName)}`} className="mobile-nav-item active">
          <span className="mobile-nav-icon">🕐</span><span>Hours</span>
        </Link>
        <Link href={`/profile?vendor=${encodeURIComponent(vendorName)}`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🏦</span><span>Payouts</span>
        </Link>
      </nav>
    </main>
  );
}

export default function StoreHoursPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center', color: '#aaa' }}>Loading...</div>}>
      <StoreHoursContent />
    </Suspense>
  );
}
