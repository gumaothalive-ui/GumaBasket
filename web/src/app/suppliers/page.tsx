import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchSellers } from '@/services/marketplaceService';
import StoreGrid from './StoreGrid';

const StoresMap = dynamic(() => import('./StoresMap'), {
  loading: () => <div style={{height: '500px', background: '#eaeaea', borderRadius: '24px', display: 'grid', placeItems: 'center'}}>Loading Map...</div>
});

export const metadata: Metadata = {
  title: 'Cash & Carries | GUMA BASKET',
  description: 'Locate premium Cash and Carries and suppliers on GUMA BASKET.',
};

const CASH_AND_CARRIES = [
  { id: '1', emoji: '🍎', name: 'Epping Fresh Produce Market', location: 'Epping, WC', type: 'Produce Wholesaler', joined: '2022', lat: -33.9317, lng: 18.5365 },
  { id: '2', emoji: '🥩', name: 'Maitland Meat Packers', location: 'Maitland, WC', type: 'Butchery Cash & Carry', joined: '2023', lat: -33.9218, lng: 18.4764 },
  { id: '3', emoji: '📦', name: 'Giant Hyper Wholesale', location: 'Cape Town Central', type: 'FMCG Cash & Carry', joined: '2021', lat: -33.9265, lng: 18.4235 },
  { id: '4', emoji: '🧊', name: 'Paarden Eiland Frozen', location: 'Paarden Eiland', type: 'Frozen Goods Hub', joined: '2023', lat: -33.9056, lng: 18.4682 },
  { id: '5', emoji: '🐟', name: 'V&A Seafood Wholesale', location: 'Waterfront', type: 'Seafood Distributor', joined: '2020', lat: -33.9042, lng: 18.4192 },
  { id: '6', emoji: '🥤', name: 'Beverage City Depot', location: 'Woodstock, WC', type: 'Drinks & Liquor Wholesale', joined: '2024', lat: -33.9311, lng: 18.4523 },
];

export default async function SuppliersPage() {
  const dbSellers = await fetchSellers();
  
  const dynamicStores = dbSellers.map((seller, i) => ({
    id: seller.id,
    emoji: '🏪',
    name: seller.name,
    location: 'GUMA BASKET Partner',
    type: 'Wholesale & Cash and Carry',
    joined: new Date().getFullYear().toString(),
    // Randomize slightly around Cape Town center
    lat: -33.924 + (Math.random() * 0.06 - 0.03),
    lng: 18.44 + (Math.random() * 0.06 - 0.03),
    is_closed: seller.is_closed,
  }));

  const displayStores = dynamicStores.length > 0 ? [...dynamicStores, ...CASH_AND_CARRIES] : CASH_AND_CARRIES;

  return (
    <main style={{ background: '#ffffff', color: '#0f172a' }}>
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: '30px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.3)' }}>Verified Wholesale Partners</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>Locate Regional Cash & Carries.</h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.7 }}>Find the largest regional wholesalers, fresh produce markets, and cash & carries partnered with GUMA BASKET.</p>
        </div>
      </section>

      {/* Map Section */}
      <section style={{ padding: '60px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>Live Network Map</h2>
            <p style={{ color: '#64748b' }}>Explore our network of 6+ regional distribution hubs</p>
          </div>
        </div>
        <StoresMap stores={displayStores} />
      </section>

      <section style={{ padding: '40px 20px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <StoreGrid stores={displayStores} />
      </section>

      <section style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>Own a Cash & Carry?</h2>
        <p style={{ color: '#64748b', marginBottom: 32, fontSize: '1rem', maxWidth: 480, margin: '0 auto 32px' }}>List your wholesale products to thousands of merchants daily.</p>
        <Link href="/business-portal" style={{ background: '#0f172a', color: '#fff', padding: '14px 36px', borderRadius: 12, fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>Apply as a Vendor →</Link>
      </section>
    </main>
  );
}
