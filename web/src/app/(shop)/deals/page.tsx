import { fetchSAProducts } from '@/services/marketplaceService';
import { ProductCard } from '@/components/ui/ProductCard';
import Link from 'next/link';
import styles from '@/components/ui/listing.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Deals & Specials | GUMA BASKET',
  description: 'Shop the best deals and promotional offers on fresh groceries. Limited time specials updated weekly.',
};

export default async function DealsPage() {
  const allProducts = await fetchSAProducts(1, 400);
  const deals = allProducts.filter(p => p.is_on_sale);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        borderRadius: 20,
        padding: '40px 40px',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background text decoration */}
        <div style={{
          position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)',
          fontSize: '10rem', fontWeight: 900, opacity: 0.08, color: '#fff',
          lineHeight: 1, userSelect: 'none',
        }}>SALE</div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', borderRadius: 100,
            padding: '4px 14px', marginBottom: 12,
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              🏷️ Limited Time
            </span>
          </div>
          <h1 style={{
            color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0,
          }}>
            Deals & Specials
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 10, fontSize: 15 }}>
            {deals.length > 0
              ? `${deals.length} product${deals.length > 1 ? 's' : ''} on promotion right now`
              : 'New specials drop every Monday — check back soon'}
          </p>
        </div>

        <Link href="/shop" style={{
          background: '#fff', color: '#dc2626',
          padding: '14px 28px', borderRadius: 12,
          fontWeight: 800, fontSize: 14,
          textDecoration: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          position: 'relative', zIndex: 1,
        }}>
          Shop All Products →
        </Link>
      </div>

      {deals.length > 0 ? (
        <>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              On Promotion
            </h2>
            <span style={{
              background: '#fef2f2', color: '#dc2626',
              fontSize: 11, fontWeight: 800, padding: '3px 10px',
              borderRadius: 100, letterSpacing: '0.04em',
            }}>
              {deals.length} Items
            </span>
          </div>
          <div className={styles.gridContainer}>
            {deals.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                title={p.title}
                price={p.premium_price}
                originalPrice={p.original_price}
                imageUrl={p.image_url}
                unit={p.unit}
                rating={p.rating}
                reviewCount={p.reviewCount}
                vendorName={p.vendor_name}
                badge={{ type: 'save', text: 'ON SALE' }}
              />
            ))}
          </div>
        </>
      ) : (
        <div style={{
          padding: '5rem 2rem', textAlign: 'center',
          background: '#fef2f2', borderRadius: 16,
          border: '1px dashed #fca5a5',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
          <h2 style={{ color: '#dc2626', marginBottom: '0.75rem' }}>No deals right now</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: 1.7 }}>
            Vendors can mark products as &quot;On Sale&quot; from the Business Portal.<br />
            New specials are added every Monday — check back soon!
          </p>
          <Link href="/shop" style={{
            background: '#dc2626', color: '#fff',
            padding: '14px 28px', borderRadius: 10,
            fontWeight: 800, fontSize: 14,
          }}>
            Browse All Products
          </Link>
        </div>
      )}
    </div>
  );
}
