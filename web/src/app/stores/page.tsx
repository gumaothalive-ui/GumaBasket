export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { fetchSellers } from '@/services/marketplaceService';
import StoreCard from '@/components/ui/StoreCard';

export default async function StoresPage() {
  const sellers = await fetchSellers();

  return (
    <main style={{ minHeight: '100vh', background: '#fff', color: '#0f172a', paddingBottom: 80 }}>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '64px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '6px 18px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 20 }}>
            🏬 MULTI-STORE MARKETPLACE
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 16, lineHeight: 1.1 }}>
            Choose Your Store
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 32px' }}>
            Shop directly from South Africa's top Cash & Carry wholesalers and specialist merchants.
          </p>
          <Link href="/shop" style={{ display: 'inline-block', background: '#fff', color: '#0f172a', fontWeight: 800, padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontSize: '15px' }}>
            Browse All Products →
          </Link>
        </div>
      </section>

      {/* Store Grid */}
      <section style={{ maxWidth: 1200, margin: '60px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>Available Stores</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 4 }}>{sellers.length} stores ready to shop</p>
          </div>
        </div>

        {sellers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
            {sellers.map((store, idx) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                subtitle={store.subtitle}
                logo={store.logo}
                idx={idx}
                is_closed={store.is_closed}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', borderRadius: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏬</div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: 8 }}>No stores yet</h3>
            <p style={{ color: '#64748b', maxWidth: 400, margin: '0 auto 24px' }}>
              Stores will appear here once businesses register on the Business Portal.
            </p>
            <Link href="/shop" style={{ display: 'inline-block', background: '#0f172a', color: '#fff', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 800 }}>
              Browse All Products
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
