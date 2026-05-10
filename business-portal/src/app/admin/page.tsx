'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminStats } from './actions';

export default function AdminPortal() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats().then(res => {
      if (res.success) {
        setStats(res.stats);
      } else {
        setError(res.error || 'Failed to load stats');
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div className="pulse">Analysing Platform Growth...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Admin Header */}
      <nav style={{ padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20 }}>G</div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>COMMAND CENTER</h1>
            <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Platform Analytics v1.0</p>
          </div>
        </div>
        <Link href="/products" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 8, fontSize: '13px', fontWeight: 700 }}>Exit Admin</Link>
      </nav>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>
        
        {/* Welcome Section */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: 8 }}>Good Day, Commander.</h2>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>Here is the real-time heartbeat of Guma Basket.</p>
        </div>

        {error && <div style={{ background: '#450a0a', border: '1px solid #991b1b', color: '#f87171', padding: '16px', borderRadius: 12, marginBottom: 32 }}>⚠️ {error}</div>}

        {/* Big Numbers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
          
          <div className="admin-card">
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Registered Users</span>
            <div style={{ fontSize: '48px', fontWeight: 900, marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 12 }}>
              {stats?.users.toLocaleString()}
              <span style={{ fontSize: '14px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20 }}>+12%</span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 16 }}>Unique customer profiles across SA.</p>
          </div>

          <div className="admin-card">
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>Platform Order Volume</span>
            <div style={{ fontSize: '48px', fontWeight: 900, marginTop: 12 }}>{stats?.orders.toLocaleString()}</div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 16 }}>Completed and active shipments today.</p>
          </div>

          <div className="admin-card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px' }}>Gross Revenue</span>
            <div style={{ fontSize: '48px', fontWeight: 900, marginTop: 12, color: '#fff' }}>R{stats?.revenue.toLocaleString()}</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: 16 }}>Total market transaction value.</p>
          </div>

        </div>

        {/* Growth Chart Section */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 900 }}>Earnings Growth</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: 4 }}>Daily revenue performance over the last 30 days.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: '12px', fontWeight: 700 }}>Daily</button>
              <button style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: '12px', fontWeight: 700 }}>Weekly</button>
            </div>
          </div>

          {/* Simulated Chart Visualization */}
          <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {stats?.growth.length > 0 ? (
              stats.growth.map((g: any, i: number) => (
                <div 
                  key={i} 
                  title={`${g.date}: R${g.amount}`}
                  style={{ 
                    flex: 1, 
                    height: `${Math.max(10, (g.amount / (Math.max(...stats.growth.map((x: any) => x.amount)) || 1)) * 100)}%`, 
                    background: 'linear-gradient(to top, #3b82f6, #10b981)', 
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.8,
                    transition: 'all 0.3s'
                  }} 
                />
              ))
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic' }}>
                Waiting for more data to generate growth trajectory...
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, color: '#64748b', fontSize: '11px', fontWeight: 700 }}>
             <span>30 DAYS AGO</span>
             <span>LIVE DATA</span>
          </div>
        </div>

        {/* Action Center */}
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
           <div style={{ padding: '32px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontWeight: 900, marginBottom: 12 }}>Seller Approval Queue</h4>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: 20 }}>There are currently 0 new sellers waiting for verification.</p>
              <button style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: 10, fontWeight: 800, fontSize: '13px' }}>Manage Vendors</button>
           </div>
           <div style={{ padding: '32px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontWeight: 900, marginBottom: 12 }}>System Health</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: '14px', fontWeight: 700, marginBottom: 20 }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
                 All Systems Operational
              </div>
              <button style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #94a3b8', color: '#94a3b8', borderRadius: 10, fontWeight: 800, fontSize: '13px' }}>View Server Logs</button>
           </div>
        </div>

      </main>

      <style jsx global>{`
        .admin-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 32px;
          border-radius: 24px;
          transition: all 0.3s ease;
        }
        .admin-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-5px);
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
