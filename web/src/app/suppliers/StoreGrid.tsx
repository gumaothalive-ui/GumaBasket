'use client';

import { useEffect, useState } from 'react';

interface Store {
  id: string;
  emoji: string;
  name: string;
  location: string;
  type: string;
  joined: string;
}

interface StoreStatus {
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
}

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ap}`;
}

function StoreCard({ store }: { store: Store }) {
  const [status, setStatus] = useState<StoreStatus | null>(null);

  useEffect(() => {
    fetch(`/api/store-status?vendor=${encodeURIComponent(store.name)}`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ isOpen: true, openingTime: '08:00', closingTime: '18:00' }));
  }, [store.name]);

  const isClosed = status !== null && !status.isOpen;

  return (
    <div style={{
      border: isClosed ? '1.5px solid #e2e8f0' : '1.5px solid #f1f5f9',
      borderRadius: 20,
      padding: 32,
      background: isClosed ? '#f8f9fa' : '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s',
      opacity: isClosed ? 0.85 : 1,
    }}>
      {/* Closed overlay banner */}
      {isClosed && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: -30,
          background: '#dc2626',
          color: '#fff',
          fontSize: '10px',
          fontWeight: 900,
          letterSpacing: '0.1em',
          padding: '5px 44px',
          transform: 'rotate(35deg)',
          textTransform: 'uppercase',
          boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
        }}>
          CLOSED
        </div>
      )}

      {/* Emoji with greyscale filter when closed */}
      <div style={{ fontSize: 48, marginBottom: 16, filter: isClosed ? 'grayscale(1)' : 'none', transition: 'filter 0.3s' }}>
        {store.emoji}
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 6, color: isClosed ? '#64748b' : '#0f172a' }}>
        {store.name}
      </h2>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: isClosed ? '#94a3b8' : '#111111', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        📍 {store.location}
      </p>
      <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
        {store.type}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Open/Closed status badge */}
        {status && (
          <span style={{
            background: isClosed ? '#fef2f2' : '#ecfdf5',
            color: isClosed ? '#dc2626' : '#059669',
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isClosed ? '#dc2626' : '#22c55e',
              display: 'inline-block',
              boxShadow: isClosed ? 'none' : '0 0 0 2px rgba(34,197,94,0.3)',
            }} />
            {isClosed
              ? `Closed · Opens ${fmt12(status.openingTime)}`
              : `Open · Closes ${fmt12(status.closingTime)}`
            }
          </span>
        )}
        {!status && (
          <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: 30 }}>
            ✓ Verified Partner
          </span>
        )}
      </div>

      {/* Closed notice */}
      {isClosed && (
        <div style={{
          marginTop: 14,
          background: '#fff8f0',
          border: '1px solid #fed7aa',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: '11px',
          color: '#c2410c',
          fontWeight: 600,
        }}>
          📦 Orders placed now will be fulfilled when we open
        </div>
      )}
    </div>
  );
}

export default function StoreGrid({ stores }: { stores: Store[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
      {stores.map(s => <StoreCard key={s.id} store={s} />)}
    </div>
  );
}
