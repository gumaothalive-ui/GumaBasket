'use client';

import { useEffect, useState } from 'react';

interface StoreStatus {
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
}

function fmt12(time24: string) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function StoreStatusBanner() {
  const [status, setStatus] = useState<StoreStatus | null>(null);

  useEffect(() => {
    fetch('/api/store-status?vendor=Unity+cash+and+carry')
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => {}); // fail silently
  }, []);

  if (!status || status.isOpen) return null; // Don't show if open

  return (
    <div style={{
      background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
      color: '#fff',
      padding: '10px 16px',
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 16 }}>🌙</span>
      <span>
        We&apos;re currently <strong>closed</strong> — opens at <strong>{fmt12(status.openingTime)}</strong>.
      </span>
      <span style={{
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 20,
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}>
        📦 Orders placed now will be fulfilled in the morning
      </span>
    </div>
  );
}
