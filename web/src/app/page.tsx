export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { ProductCard } from '@/components/ui/ProductCard';
import { fetchSAProducts, fetchSellers } from '@/services/marketplaceService';
import { MobileHome } from '@/components/mobile/MobileHome';
import styles from './page.module.css';

// ── CONFIG DRIVEN MERCHANDISING ──

const PROMO_TILES = [
  { title: 'Weekly Groceries', subtitle: 'SHOP FRESH PRODUCE', image: '/Design/media__1774993749899.png' },
  { title: 'Premium Dairy', subtitle: 'SHOP MILK & CHEESE', image: '/Design/media__1774992046465.png' },
  { title: 'Snacks & Treats', subtitle: 'SHOP EVERYDAY SNACKS', image: '/Design/media__1774994500971.png' },
  { title: 'Exceptional Butchery', subtitle: 'SHOP PREMIUM CUTS', image: '/Design/media__1774993216792.png' }
];

const FULL_WIDTH_BANNER = {
  title: "Same Great Quality.\nLast Year's Prices.",
  subtitle: "Enjoy our exceptional quality at the exact same price as last year.",
  cta: "Shop The Difference"
};

const THIN_BANNER = {
  title: "Celebrate With A Feast To Remember",
  cta: "SHOP THE OCCASION"
};

// ── ICONS ──
const ICONS = {
  fruit: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C12 2 10 5 10 7C10 9 12 11 12 11C12 11 14 9 14 7C14 5 12 2 12 2Z"/><circle cx="12" cy="15" r="7"/></svg>,
  meat: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8C16 8 13.5 9.5 12 12M12 12C10.5 14.5 8 16 8 16M12 12C12 12 13 14 16 16C19 18 20 16 20 16C20 16 18 13 16 8ZM8 16C8 16 6 18 4 16C2 14 4 12 4 12C4 12 6.5 9 8 8C9.5 7 12 8 12 8"/></svg>,
  bakery: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 18H4V14C4 12 6 10 8 10H16C18 10 20 12 20 14V18H12ZM12 18V22M8 10C8 6 12 4 16 6"/></svg>,
  ready: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2M10 6V18"/></svg>,
  dairy: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="8" width="12" height="14" rx="1"/><path d="M9 8V4H15V8"/><path d="M10 16H14"/></svg>,
  pantry: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M6 10H18M10 14H14"/></svg>,
  beverages: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 22H16L18 6H6L8 22Z"/><path d="M10 6V2M14 6V2"/></svg>,
  frozen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2V22M6 6L18 18M18 6L6 18"/></svg>
};

const DEPARTMENTS = [
  { label: 'Fruit & Veg', icon: ICONS.fruit, href: '/shop?category=fruit-veg' },
  { label: 'Meat, Poultry & Fish', icon: ICONS.meat, href: '/shop?category=meat-poultry' },
  { label: 'Bakery & Desserts', icon: ICONS.bakery, href: '/shop?category=bakery' },
  { label: 'Ready Meals', icon: ICONS.ready, href: '/shop?category=ready-meals' },
  { label: 'Dairy, Eggs & Milk', icon: ICONS.dairy, href: '/shop?category=dairy' },
  { label: 'Pantry', icon: ICONS.pantry, href: '/shop?category=pantry' },
  { label: 'Beverages', icon: ICONS.beverages, href: '/shop?category=beverages' },
  { label: 'Frozen', icon: ICONS.frozen, href: '/shop?category=frozen' }
];

const FALLBACK_COVERS = [
  '/promo-entertaining.png',
  '/promo-supperclub.png',
  '/promo-pickledfish.png',
  '/promo-hotcross.png'
];

export default async function Home() {
  let allProducts: any[] = [];
  let dbSellers: any[] = [];
  try {
    allProducts = await fetchSAProducts(1, 400);
    dbSellers = await fetchSellers();
  } catch (err) {
    console.error('[LandingPage] Failed to fetch products or sellers:', err);
  }

  const displayMerchants = dbSellers.length > 0 ? dbSellers.slice(0, 4) : [];
  const featuredOffers = allProducts.slice(0, 5);

  return (
    <>
      <MobileHome products={allProducts} sellers={displayMerchants} />

      <div className={`${styles.pageContainer} ${styles.desktopContainer}`}>
        
        {/* ── 1. HERO BANNER ── */}
        <section className={styles.fullWidthBannerWrap}>
          <div className="container">
            <Link href="/shop" className={styles.fullWidthBanner}>
              <div className={styles.fwbContent}>
                <span className={styles.heroPill}>EVERYDAY VALUE</span>
                <h2>Same Great Quality.<br/>Last Year's Prices.</h2>
                <p>Shop smart. Save more. Delivered fresh.</p>
                <div style={{ marginTop: '24px' }}>
                  <span className={styles.fwbCta}>Shop Now &gt;</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── 2. NEARBY STORES ── */}
        <section className={styles.cashAndCarrySection}>
          <div className="container">
            <div className={styles.sectionHeadingLeft}>
              <div>
                <h2>Nearby Stores</h2>
                <p className={styles.subtext}>Shop from trusted cash & carry stores</p>
              </div>
              <Link href="/stores" className={styles.viewMoreLink}>See All Stores &gt;</Link>
            </div>

            <div className={styles.ccGrid}>
              {displayMerchants.map((merchant, idx) => (
                <Link href={merchant.link} key={idx} className={styles.ccCard} style={{ opacity: merchant.is_closed ? 0.85 : 1 }}>
                  {merchant.is_closed && (
                    <div style={{
                      position: 'absolute',
                      top: 24,
                      right: -34,
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      padding: '6px 44px',
                      transform: 'rotate(40deg)',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                      zIndex: 10,
                    }}>
                      CLOSED
                    </div>
                  )}
                  <div className={styles.ccImage}>
                    <img 
                      src={merchant.logo || FALLBACK_COVERS[idx % FALLBACK_COVERS.length]} 
                      alt={merchant.name} 
                      style={{ filter: merchant.is_closed ? 'grayscale(100%)' : 'none' }}
                    />
                    <div className={styles.ccOverlay} />
                    {!merchant.is_closed && (
                      <div className={styles.ccStatus}>OPEN</div>
                    )}
                  </div>
                  <div className={styles.ccContent} style={{ background: merchant.is_closed ? '#f8f9fa' : '#fff' }}>
                    <h3 className={styles.ccName} style={{ color: merchant.is_closed ? '#64748b' : '#0f172a' }}>{merchant.name}</h3>
                    <p className={styles.ccDesc}>⭐ 4.6 • 30-45 min</p>
                    <p className={styles.ccDelivery}>Free delivery over R500</p>
                    
                    {merchant.is_closed ? (
                      <div style={{
                        marginTop: 16,
                        background: '#fff8f0',
                        border: '1px solid #fed7aa',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#c2410c',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        📦 Orders placed now will be fulfilled when we open
                      </div>
                    ) : (
                      <div className={styles.ccFooter}>
                         <span className={styles.ccButton}>View Store</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. SHOP BY CATEGORY ── */}
        <section className={styles.departmentsSection}>
          <div className="container">
             <div className={styles.sectionHeadingLeft}>
              <div>
                <h2>Shop by Category</h2>
                <p className={styles.subtext}>Find exactly what you need</p>
              </div>
              <Link href="/shop" className={styles.viewMoreLink}>View All Categories &gt;</Link>
            </div>
            
            <div className={styles.departmentGrid}>
              {DEPARTMENTS.map((dept, idx) => (
                <Link key={idx} href={dept.href} className={styles.departmentBox}>
                  <div className={styles.deptIcon}>{dept.icon}</div>
                  <span>{dept.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. POPULAR THIS WEEK ── */}
        {featuredOffers.length > 0 && (
          <section className={styles.productCarousels}>
            <div className="container">
              <div className={styles.sectionHeadingLeft}>
                <div>
                  <h2>Popular This Week</h2>
                  <p className={styles.subtext}>Loved by our customers</p>
                </div>
                <Link href="/shop" className={styles.viewMoreLink}>See All &gt;</Link>
              </div>
              <div className={styles.productGrid}>
                 {/* Recreate products to match horizontal layout precisely, using our custom styles for home page */}
                 {featuredOffers.map(p => (
                   <Link href={`/product/${p.id}`} key={p.id} className={styles.horizontalProductCard}>
                      <img src={p.image_url} alt={p.title} className={styles.hpImage}/>
                      <div className={styles.hpInfo}>
                         <div className={styles.hpTitle}>{p.title}</div>
                         <div className={styles.hpUnit}>{p.unit || '1kg'}</div>
                         <div className={styles.hpPrice}>R{p.premium_price.toFixed(2)}</div>
                      </div>
                      <div className={styles.hpAddBtn}>+</div>
                   </Link>
                 ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 5. BOTTOM PROMO BANNER ── */}
        <section className={styles.bottomPromoWrap}>
          <div className="container">
             <div className={styles.bottomPromo}>
                <div className={styles.bpContent}>
                   <div className={styles.bpIcon}>%</div>
                   <div>
                     <span className={styles.bpTag}>SAVE MORE</span>
                     <h2>Fresh Deals. Every Week.</h2>
                     <p>New specials every Monday. Don't miss out!</p>
                   </div>
                </div>
                <Link href="/shop" className={styles.bpBtn}>View Specials</Link>
             </div>
          </div>
        </section>

      </div>
    </>
  );
}
