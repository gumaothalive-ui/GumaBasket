'use client';

import { useState } from 'react';
import Link from 'next/link';

const STORE_IMAGES = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&q=80',
  'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800&q=80',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
];

interface StoreCardProps {
  id: string;
  name: string;
  subtitle: string;
  logo?: string;
  idx: number;
  is_closed?: boolean;
}

export default function StoreCard({ id, name, subtitle, logo, idx, is_closed }: StoreCardProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <Link
      href={`/stores/${id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          border: is_closed ? '1.5px solid #e2e8f0' : '1.5px solid #f1f5f9',
          borderRadius: 20,
          overflow: 'hidden',
          background: is_closed ? '#f8f9fa' : '#fff',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          opacity: is_closed ? 0.85 : 1,
          position: 'relative',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }}
      >
        {/* Closed overlay banner (Cash & Carry style) */}
        {is_closed && (
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

        {/* Store Image */}
        <div style={{ height: 180, overflow: 'hidden', position: 'relative', background: '#f8fafc' }}>
          <img
            src={logo && !logoError ? logo : STORE_IMAGES[idx % STORE_IMAGES.length]}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: is_closed ? 'grayscale(100%)' : 'none' }}
            onError={() => setLogoError(true)}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 60%)' }} />
          {!is_closed && (
            <div style={{ position: 'absolute', top: 14, right: 14, background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.04em' }}>
              ● OPEN
            </div>
          )}
        </div>

        {/* Store Info */}
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: 4, letterSpacing: '-0.3px', color: is_closed ? '#64748b' : '#0f172a' }}>{name}</h3>
              <p style={{ color: is_closed ? '#94a3b8' : '#64748b', fontSize: '13px', fontWeight: 600 }}>{subtitle}</p>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', filter: is_closed ? 'grayscale(1)' : 'none' }}>
              {logo && !logoError ? (
                <img 
                  src={logo} 
                  alt={name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>{name[0]}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              <span>🚚</span> Free delivery over R500
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              <span>⏱</span> 30–60 min
            </div>
          </div>

          {/* Closed notice (Cash & Carry style) */}
          {is_closed ? (
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
            <div style={{ marginTop: 16, background: '#0f172a', color: '#fff', textAlign: 'center', padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: '14px' }}>
              Shop Now →
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
