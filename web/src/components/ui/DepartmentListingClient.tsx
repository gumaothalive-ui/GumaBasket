'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import styles from './listing.module.css';

interface Product {
  id: string;
  title: string;
  premium_price: number;
  original_price?: number;
  image_url: string;
  unit: string;
  rating: number;
  reviewCount: number;
  vendor_name: string;
  category: string;
  is_on_sale: boolean;
}

interface DepartmentListingClientProps {
  title: string;
  category: string;
  products: Product[];
}

const SIDEBAR_CATEGORIES = [
  { label: 'FRUIT, VEG & SALAD', cat: 'fruit-veg' },
  { label: 'MEAT, POULTRY & FISH', cat: 'meat-poultry' },
  { label: 'BAKERY & DESSERTS', cat: 'bakery' },
  { label: 'DAIRY, EGGS & MILK', cat: 'dairy' },
  { label: 'PANTRY & DRY GOODS', cat: 'pantry' },
  { label: 'BEVERAGES & JUICE', cat: 'beverages' },
  { label: 'SWEETS & SNACKS', cat: 'sweets' },
  { label: 'HOUSEHOLD & CARE', cat: 'household-care' },
  { label: 'FROZEN FOODS', cat: 'frozen' }
];

export function DepartmentListingClient({ title, category, products }: DepartmentListingClientProps) {
  const [onPromoOnly, setOnPromoOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  const promoCount = products.filter(p => p.is_on_sale).length;

  let filtered = onPromoOnly ? products.filter(p => p.is_on_sale) : products;

  if (sortBy === 'price-asc') filtered = [...filtered].sort((a, b) => a.premium_price - b.premium_price);
  else if (sortBy === 'price-desc') filtered = [...filtered].sort((a, b) => b.premium_price - a.premium_price);

  return (
    <div className={`container ${styles.listingLayout}`}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.filterSection}>
          <div
            className={styles.filterHeader}
            style={{ cursor: 'pointer' }}
            onClick={() => setOnPromoOnly(v => !v)}
          >
            <span className={styles.toggleLabel} style={{ color: onPromoOnly ? '#dc2626' : undefined }}>
              ON PROMOTION {promoCount > 0 && `(${promoCount})`}
            </span>
            <div
              className={styles.toggleSwitch}
              style={{ backgroundColor: onPromoOnly ? '#dc2626' : undefined }}
            >
              <div className={`${styles.switchKnob} ${onPromoOnly ? styles.switchOn : ''}`} />
            </div>
          </div>
          {onPromoOnly && promoCount === 0 && (
            <p style={{ fontSize: '0.72rem', color: '#999', marginTop: 8 }}>
              No promotions in this category yet.
            </p>
          )}
        </div>

        <div className={styles.filterGroup}>
          <h3 className={styles.filterTitle}>
            DEPARTMENTS <span className={styles.minusIcon}>−</span>
          </h3>
          <div className={styles.filterList}>
            {SIDEBAR_CATEGORIES.map((item) => (
              <Link
                key={item.cat}
                href={`/${item.cat}`}
                className={category === item.cat ? styles.activeLink : ''}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <h3 className={styles.filterTitle}>
            LIFESTYLE <span className={styles.minusIcon}>−</span>
          </h3>
          <div className={styles.filterList}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" /> Halal
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" /> Vegan
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" /> Gluten Free
            </label>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={styles.mainContent}>
        <div className={styles.headerTools}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.itemCount}>
              {filtered.length} Item{filtered.length !== 1 ? 's' : ''} Found
              {onPromoOnly && ' · On Promotion Only'}
            </p>
          </div>
          <div className={styles.toolbar}>
            <div className={styles.viewToggles}>
              <span className={`${styles.viewBtn} ${styles.activeView}`}>▦</span>
              <span className={styles.viewBtn}>≡</span>
            </div>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="relevance">SORT BY: RELEVANCE</option>
              <option value="price-asc">PRICE: LOW TO HIGH</option>
              <option value="price-desc">PRICE: HIGH TO LOW</option>
            </select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className={styles.gridContainer}>
            {filtered.map(p => (
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
                badge={p.is_on_sale ? { type: 'save', text: 'SALE' } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState} style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--secondary-text)', fontSize: '1.25rem' }}>
              {onPromoOnly
                ? `No promotions in ${title.toLowerCase()} right now.`
                : `We're currently sourcing the finest ${title.toLowerCase()} for you.`}
            </p>
            <div style={{ marginTop: '1rem' }}>
              {onPromoOnly ? (
                <button
                  onClick={() => setOnPromoOnly(false)}
                  style={{ background: '#111', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Show All Products
                </button>
              ) : (
                <Link href="/" style={{ color: 'var(--primary-text)', fontWeight: '700', textDecoration: 'underline' }}>
                  BACK TO HOME
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
