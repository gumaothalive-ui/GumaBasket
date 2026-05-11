'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  unit: string;
  rating: number;
  reviewCount: number;
  vendorName?: string;
  badge?: {
    type: 'wlist' | 'save' | 'premium';
    text?: string;
  };
}

export function ProductCard({
  id,
  title,
  price,
  originalPrice,
  imageUrl,
  unit,
  rating,
  reviewCount,
  vendorName,
  badge
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id,
      title,
      price,
      imageUrl: imageUrl || '',
      vendorName
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const safeRating = Math.min(Math.max(Math.round(rating || 4), 1), 5);
  const safeImage = imageUrl || '';

  return (
    <div className={styles.premiumCard}>
      <Link href={`/product/${id}`} className={styles.link}>
        <div className={styles.imageBox}>
          <img 
            src={safeImage} 
            alt={title} 
            className={styles.image} 
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />
          {badge && (
            <div className={`${styles.badge} ${styles[badge.type]}`}>
              {badge.text || badge.type.toUpperCase()}
            </div>
          )}
          
          <button 
            className={`${styles.cartQuickBtn} ${added ? styles.isAdded : ''}`}
            onClick={handleAddToCart}
            aria-label="Quick Add"
          >
            {added ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            )}
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.vendorRow}>
            <span className={styles.vendor}>{vendorName || 'Elite Partner'}</span>
            <div className={styles.rating}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span>{rating?.toFixed(1) || '4.8'}</span>
            </div>
          </div>
          
          <h3 className={styles.title}>{title}</h3>
          
          <div className={styles.priceRow}>
            <div className={styles.prices}>
              <span className={styles.currentPrice}>R {price.toFixed(2)}</span>
              {originalPrice && originalPrice > price && <span className={styles.oldPrice}>R {originalPrice.toFixed(2)}</span>}
            </div>
            <span className={styles.unit}>{unit}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
