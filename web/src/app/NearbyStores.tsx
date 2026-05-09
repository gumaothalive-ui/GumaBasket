'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface Merchant {
  name: string;
  logo?: string;
  link: string;
}

const FALLBACK_COVERS = [
  '/promo-entertaining.png',
  '/promo-supperclub.png',
  '/promo-pickledfish.png',
  '/promo-hotcross.png',
];

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ap}`;
}

function StoreCard({ merchant, idx }: { merchant: Merchant; idx: number }) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [openingTime, setOpeningTime] = useState('');

  useEffect(() => {
    fetch(`/api/store-status?vendor=${encodeURIComponent(merchant.name)}`)
      .then(r => r.json())
      .then(d => { setIsOpen(d.isOpen); setOpeningTime(d.openingTime || ''); })
      .catch(() => setIsOpen(true));
  }, [merchant.name]);

  const isClosed = isOpen === false;

  return (
    <Link
      href={merchant.link}
      className={styles.storeCard}
      style={{ opacity: isClosed ? 0.88 : 1 }}
    >
      <div className={styles.storeImageWrap} style={{ filter: isClosed ? 'grayscale(0.5) brightness(0.9)' : 'none' }}>
        <img
          src={merchant.logo || FALLBACK_COVERS[idx % FALLBACK_COVERS.length]}
          alt={merchant.name}
        />
        <span className={`${styles.storeStatus} ${isClosed ? styles.closed : styles.open}`}>
          {isOpen === null ? '···' : isClosed ? 'Closed' : 'Open now'}
        </span>
        {isClosed && (
          <div className={styles.closedRibbon}>
            Orders fulfilled in the morning
          </div>
        )}
      </div>

      <div className={styles.storeBody}>
        <h3 className={styles.storeName}>{merchant.name}</h3>
        <p className={styles.storeMeta}>
          {isClosed
            ? `⏰ Opens at ${fmt12(openingTime)}`
            : '⭐ 4.6 · 30–45 min delivery'}
        </p>
        <p className={styles.storeDelivery}>
          {isClosed ? 'Place order now, ready at opening' : 'Free delivery over R500'}
        </p>
        <span className={styles.storeCta}>
          {isClosed ? 'Order for Morning' : 'View Store →'}
        </span>
      </div>
    </Link>
  );
}

export default function NearbyStores({ merchants }: { merchants: Merchant[] }) {
  if (merchants.length === 0) return null;
  return (
    <div className={styles.storeGrid}>
      {merchants.map((m, i) => (
        <StoreCard key={i} merchant={m} idx={i} />
      ))}
    </div>
  );
}
