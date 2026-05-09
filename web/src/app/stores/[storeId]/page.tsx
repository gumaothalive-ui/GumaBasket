export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchStoreById, fetchProductsByStoreId } from '@/services/marketplaceService';
import { ProductCard } from '@/components/ui/ProductCard';

export default async function StorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const resolvedParams = await params;
  const storeId = resolvedParams.storeId;
  
  const [store, products] = await Promise.all([
    fetchStoreById(storeId),
    fetchProductsByStoreId(storeId)
  ]);

  if (!store) {
    return notFound();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text-main)', paddingBottom: '80px' }}>
      
      {/* Store Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '60px 20px' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
           <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#fff', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.2)' }}>
              <img src={store.logo || store.image} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           </div>
           <div>
              <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: '11px', fontWeight: '800', display: 'inline-block', padding: '4px 10px', borderRadius: '4px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                 ✓ {store.subtitle}
              </div>
              <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.5px', margin: 0 }}>{store.name}</h1>
              <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '8px', maxWidth: '400px' }}>
                 Shop directly from {store.name}'s entire product catalog. Quality and freshness guaranteed.
              </p>
           </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '40px' }}>
        {/* Search & Category Filters */}
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '32px', alignItems: 'center', scrollbarWidth: 'none' }}>
          <div style={{ background: '#f1f5f9', padding: '12px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '300px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '16px' }}>🔍</span>
            <input type="text" placeholder={`Search ${store.name}...`} style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: '500', color: '#0f172a' }} />
          </div>
          <div style={{ background: '#0f172a', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', cursor: 'pointer' }}>
             All Products
          </div>
          {Array.from(new Set(products.map(p => p.category))).map((cat, i) => (
             <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', cursor: 'pointer', textTransform: 'capitalize' }}>
                {cat.replace('-', ' ')}
             </div>
          ))}
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Store Products</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{products.length} Products</span>
        </div>

        {products.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
            {products.map(p => (
              <ProductCard 
                key={p.id} 
                id={p.id} 
                title={p.title} 
                price={p.premium_price} 
                imageUrl={p.image_url} 
                unit={p.unit} 
                rating={p.rating} 
                reviewCount={p.reviewCount} 
                vendorName={p.vendor_name}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: '80px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
             <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏬</div>
             <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>No products yet</h3>
             <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
               This store hasn't uploaded any products to their Guma Basket catalog yet. Check back later!
             </p>
             <Link href="/" style={{ display: 'inline-block', marginTop: '24px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
                &larr; Back to Marketplace
             </Link>
          </div>
        )}
      </div>

    </div>
  );
}
