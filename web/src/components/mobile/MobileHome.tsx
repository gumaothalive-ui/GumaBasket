'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from './MobileHome.module.css';

interface MobileHomeProps {
  products: any[];
  sellers?: any[];
}

const CATEGORY_TABS = [
  { label: 'All', value: null },
  { label: '🏷️ Deals', value: 'deals' },
  { label: 'Produce', value: 'fruit-veg' },
  { label: 'Butchery', value: 'meat-poultry' },
  { label: 'Dairy', value: 'dairy' },
  { label: 'Pantry', value: 'pantry' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Drinks', value: 'beverages' },
  { label: 'Frozen', value: 'frozen' },
];

export function MobileHome({ products, sellers = [] }: MobileHomeProps) {
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleQuickAdd = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: p.id,
      title: p.title,
      price: p.premium_price || p.base_price,
      quantity: 1,
      imageUrl: p.image_url,
      vendorName: p.vendor_name
    });
  };

  // Filter by active tab category, then split into sections
  const isDealTab = activeTab === 'deals';
  const filtered = isDealTab
    ? products.filter(p => p.is_on_sale)
    : activeTab
      ? products.filter(p => p.category?.toLowerCase().includes(activeTab))
      : products;
  const popularProducts = filtered.slice(0, 4);
  const recentWatched = filtered.slice(4, 8);

  return (
    <div className={styles.mobileContainer}>
      
      {/* HEADER */}
      <div className={styles.headerArea}>
        <div className={styles.topBar}>
          <div className={styles.locationBlock}>
            <span className={styles.deliveryTo}>Delivery To</span>
            <span className={styles.locationName}>
              📍 Nelson Mandela Bay, South Africa
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </span>
          </div>
          <div className={styles.actionIcons}>
            <Link href="/search" className={styles.iconButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </Link>
            <Link href="/wishlist" className={styles.iconButton} title="My Wishlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </Link>
            <Link href="/cart" className={styles.iconButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </Link>
          </div>
        </div>

        <div className={styles.heroBanner}>
          <div className={styles.bannerDecor}></div>
          <div className={styles.bannerContent}>
            <h2 className={styles.bannerTitle}>Shop Everything<br/>Online</h2>
            <Link href="/shop" className={styles.bannerBtn}>Start Shopping</Link>
          </div>
          <img src="/Design/mobile_banner.png" alt="Shopping" className={styles.bannerImage} />
        </div>
      </div>

      {/* TABS */}
      <div className={styles.categoryTabs} style={{ marginBottom: activeTab ? '10px' : '0' }}>
        {CATEGORY_TABS.map(tab => (
          <div
            key={tab.label}
            className={`${styles.tabPill} ${activeTab === tab.value && !(tab.value === null && activeTab !== null) ? styles.active : ''} ${tab.value === null && activeTab === null ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* STORES / CASH & CARRY */}
      {sellers.length > 0 && (
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Stores Near You</h3>
            <Link href="/stores" className={styles.viewAllBtn}>See All &gt;</Link>
          </div>
          <div className={styles.storesScroll}>
            {sellers.map((merchant, idx) => (
              <Link href={merchant.link || `/stores/${merchant.id}`} key={idx} className={styles.storeCard} style={{ opacity: merchant.is_closed ? 0.85 : 1 }}>
                <div className={styles.storeImageWrapper} style={{ position: 'relative', overflow: 'hidden' }}>
                  {merchant.is_closed && (
                    <div style={{
                      position: 'absolute',
                      top: 14,
                      right: -30,
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      padding: '4px 30px',
                      transform: 'rotate(40deg)',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                      zIndex: 10,
                    }}>
                      CLOSED
                    </div>
                  )}
                  <img 
                    src={merchant.logo || '/promo-entertaining.png'} 
                    alt={merchant.name} 
                    className={styles.storeImage}
                    style={{ filter: merchant.is_closed ? 'grayscale(100%)' : 'none' }}
                  />
                  {!merchant.is_closed && (
                    <div className={styles.storeOverlay}>OPEN</div>
                  )}
                </div>
                <div className={styles.storeInfo} style={{ background: merchant.is_closed ? '#f8f9fa' : 'transparent' }}>
                  <h4 className={styles.storeName} style={{ color: merchant.is_closed ? '#64748b' : 'inherit' }}>{merchant.name}</h4>
                  <p className={styles.storeMeta} style={{ color: merchant.is_closed ? '#94a3b8' : 'inherit' }}>⭐ 4.6 • 30-45 min</p>
                  {merchant.is_closed && (
                    <div style={{
                      marginTop: 8,
                      background: '#fff8f0',
                      border: '1px solid #fed7aa',
                      borderRadius: 6,
                      padding: '6px 8px',
                      fontSize: '10px',
                      color: '#c2410c',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      📦 Fulfill when open
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS / CONTENT */}
      {activeTab ? (
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              {CATEGORY_TABS.find(t => t.value === activeTab)?.label}
            </h3>
            <span className={styles.itemCountMobile}>{filtered.length} Items</span>
          </div>
          <div className={styles.productGrid}>
            {filtered.map((p, i) => (
              <Link href={`/product/${p.id}`} key={p.id} style={{textDecoration:'none'}}>
                <div className={styles.productCard}>
                  {p.is_on_sale && <div className={`${styles.productBadge} ${styles.sale}`}>Sale</div>}
                  <div className={styles.imageWrapper}>
                    <img src={p.image_url} alt={p.title} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=60'; }} />
                  </div>
                  <h4 className={styles.productTitle}>{p.title}</h4>
                  <div className={styles.ratingRow}>
                    {Array.from({length: 5}).map((_, idx) => (
                      <svg key={idx} className={styles.starIcon} fill={idx < Math.floor(p.rating || 5) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                    <span className={styles.ratingText}>({p.reviewCount || 120})</span>
                  </div>
                  <div className={styles.priceRow}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                      <span className={styles.currentPrice}>R{p.premium_price?.toFixed(2)}</span>
                      {p.base_price > 0 && p.base_price > p.premium_price && (
                        <span className={styles.oldPrice}>R{Number(p.base_price).toFixed(2)}</span>
                      )}
                    </div>
                    <button onClick={(e) => handleQuickAdd(e, p)} className={styles.quickAddBtn}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* POPULAR PRODUCTS */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Popular Products</h3>
              <Link href="/shop" className={styles.seeAll}>See All &gt;</Link>
            </div>
            <div className={styles.productGrid}>
              {popularProducts.map((p, i) => (
                <Link href={`/product/${p.id}`} key={p.id} style={{textDecoration:'none'}}>
                  <div className={styles.productCard}>
                    {i % 2 === 0 ? <div className={`${styles.productBadge} ${styles.sale}`}>Sale</div> : <div className={styles.productBadge}>New</div>}
                    <div className={styles.imageWrapper}>
                      <img src={p.image_url} alt={p.title} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=60'; }} />
                    </div>
                    <h4 className={styles.productTitle}>{p.title}</h4>
                    <div className={styles.ratingRow}>
                      {Array.from({length: 5}).map((_, idx) => (
                        <svg key={idx} className={styles.starIcon} fill={idx < Math.floor(p.rating || 5) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      ))}
                      <span className={styles.ratingText}>({p.reviewCount || 120})</span>
                    </div>
                    <div className={styles.priceRow}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                        <span className={styles.currentPrice}>R{p.premium_price?.toFixed(2)}</span>
                        {p.base_price > 0 && p.base_price > p.premium_price && (
                          <span className={styles.oldPrice}>R{Number(p.base_price).toFixed(2)}</span>
                        )}
                      </div>
                      <button onClick={(e) => handleQuickAdd(e, p)} className={styles.quickAddBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* RECENT WATCHED */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Recent Watched</h3>
              <Link href="/shop" className={styles.seeAll}>See All &gt;</Link>
            </div>
            <div className={styles.productGrid}>
              {recentWatched.map((p, i) => (
                <Link href={`/product/${p.id}`} key={p.id} style={{textDecoration:'none'}}>
                  <div className={styles.productCard}>
                    <div className={styles.imageWrapper}>
                      <img src={p.image_url} alt={p.title} />
                    </div>
                    <h4 className={styles.productTitle}>{p.title}</h4>
                    <div className={styles.ratingRow}>
                      <span className={styles.starIcon} style={{color:'#1cb5a3'}}><svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
                      <span className={styles.ratingText}>{p.rating || 4.5} | {p.vendor_name?.substring(0, 5) || '1K+'} sold</span>
                    </div>
                    <div className={styles.priceRow}>
                      <span className={styles.currentPrice}>R{p.premium_price?.toFixed(2)}</span>
                      <button onClick={(e) => handleQuickAdd(e, p)} className={styles.quickAddBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
