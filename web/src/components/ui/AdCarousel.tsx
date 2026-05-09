'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Ad {
  id: string;
  seller_name: string;
  title: string;
  tagline?: string;
  image_url: string;
  product_name?: string;
  headline?: string;
  original_price?: number;
  sale_price?: number;
  discount_pct?: number;
  star_rating?: number;
  benefit_tags?: string[];
  cta_url?: string;
  clicks?: number;
}

const DEFAULT_BENEFITS = ['100% Natural', 'Farm Fresh', 'Locally Sourced'];

const BENEFIT_ICONS: Record<string, string> = {
  '100% Natural': '🌿',
  'Farm Fresh': '🌱',
  'Locally Sourced': '📍',
  'Rich in Vitamins': '❤️',
  'Organic': '♻️',
  'No Additives': '✅',
  'Free Range': '🐓',
  'Whole Grain': '🌾',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: 14, color: i <= Math.round(rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, marginLeft: 3 }}>({rating.toFixed(1)})</span>
    </span>
  );
}

/* ── FEATURED (wide single-ad layout) ── */
function FeaturedAd({ ad }: { ad: Ad }) {
  const [hovered, setHovered] = useState(false);
  const hasDiscount = ad.discount_pct && ad.discount_pct > 0;
  const hasPrice = ad.sale_price && ad.sale_price > 0;
  const rating = ad.star_rating || 0;
  const benefits = ad.benefit_tags?.length ? ad.benefit_tags.slice(0, 3) : DEFAULT_BENEFITS;

  const handleClick = async () => {
    await supabase.from('advertisements').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', ad.id);
    if (ad.cta_url) window.open(ad.cta_url, '_blank');
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        boxShadow: hovered
          ? '0 24px 48px -8px rgba(0,0,0,0.18)'
          : '0 6px 20px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        background: '#fff',
        minHeight: 280,
      }}
    >
      {/* Left: full-bleed image */}
      <div style={{ position: 'relative', flex: '0 0 55%', minHeight: 280, overflow: 'hidden' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${ad.image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'transform 0.4s ease',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
          }}
        />
        {/* gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />

        {/* Farm fresh badge */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: '#16a34a', color: '#fff',
          fontSize: 11, fontWeight: 800, padding: '5px 12px',
          borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4,
          letterSpacing: '0.04em',
        }}>
          🌿 FARM FRESH
        </div>

        {/* Discount badge */}
        {hasDiscount && (
          <div style={{
            position: 'absolute', top: 14, right: 16,
            width: 56, height: 56, borderRadius: '50%',
            background: '#ea580c', color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, lineHeight: 1.1,
            boxShadow: '0 4px 12px rgba(234,88,12,0.5)',
          }}>
            <span>{ad.discount_pct}%</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>OFF</span>
          </div>
        )}

        {/* Headline overlaid on image */}
        {ad.headline && (
          <div style={{ position: 'absolute', bottom: 20, left: 20, right: 60 }}>
            <p style={{
              color: '#fff', fontSize: 28, fontWeight: 900, lineHeight: 1.15,
              margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              letterSpacing: '-0.5px',
            }}>
              {ad.headline}
            </p>
          </div>
        )}
      </div>

      {/* Right: info panel */}
      <div style={{
        flex: 1,
        padding: '28px 32px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: '#fff',
      }}>
        <div>
          {/* Ad label + store */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#555', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>Ad</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>{ad.seller_name}</span>
          </div>

          {/* Star rating */}
          {rating > 0 && <div style={{ marginBottom: 10 }}><StarRating rating={rating} /></div>}

          {/* Product name */}
          <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            {ad.product_name || ad.title}
          </h3>

          {/* Tagline */}
          {ad.tagline && (
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 14px', lineHeight: 1.5 }}>{ad.tagline}</p>
          )}

          {/* Offer text */}
          {hasDiscount && (
            <p style={{ fontSize: 14, color: '#16a34a', fontWeight: 700, margin: '0 0 10px' }}>
              Big Discount – Save {ad.discount_pct}%!
            </p>
          )}

          {/* Price */}
          {hasPrice && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 34, fontWeight: 900, color: '#111', letterSpacing: '-1px' }}>
                R{ad.sale_price!.toFixed(2)}
              </span>
              {ad.original_price && ad.original_price > ad.sale_price! && (
                <span style={{ fontSize: 16, color: '#9ca3af', textDecoration: 'line-through' }}>
                  R{ad.original_price.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Urgency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>⏱️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>Limited time offer – Shop now!</span>
          </div>

          {/* Benefits */}
          <div style={{ display: 'flex', gap: 16 }}>
            {benefits.map((b) => (
              <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {BENEFIT_ICONS[b] || '✅'}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textAlign: 'center', maxWidth: 64, lineHeight: 1.3 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          style={{
            marginTop: 24,
            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
            color: '#fff', border: 'none',
            padding: '14px 0', borderRadius: 12,
            fontWeight: 800, fontSize: 16,
            cursor: 'pointer', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
            transition: 'opacity 0.2s',
          }}
        >
          Shop Now <span style={{ fontSize: 18 }}>→</span>
        </button>
      </div>
    </div>
  );
}

/* ── COMPACT CARD (for 2+ ads grid) ── */
function AdCard({ ad }: { ad: Ad }) {
  const [hovered, setHovered] = useState(false);
  const hasDiscount = ad.discount_pct && ad.discount_pct > 0;
  const hasPrice = ad.sale_price && ad.sale_price > 0;
  const rating = ad.star_rating || 0;
  const benefits = ad.benefit_tags?.length ? ad.benefit_tags.slice(0, 3) : DEFAULT_BENEFITS;

  const handleClick = async () => {
    await supabase.from('advertisements').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', ad.id);
    if (ad.cta_url) window.open(ad.cta_url, '_blank');
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        boxShadow: hovered ? '0 20px 40px -8px rgba(0,0,0,0.16)' : '0 4px 12px rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'box-shadow 0.25s, transform 0.25s',
        transform: hovered ? 'translateY(-4px)' : 'none',
      }}
    >
      {/* Hero image */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: '100%',
          backgroundImage: `url(${ad.image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transition: 'transform 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(0,0,0,0.58) 0%,rgba(0,0,0,0.15) 60%,transparent 100%)' }} />
        <div style={{ position: 'absolute', top: 12, left: 12, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
          🌿 FARM FRESH
        </div>
        {hasDiscount && (
          <div style={{ position: 'absolute', top: 10, right: 12, width: 50, height: 50, borderRadius: '50%', background: '#ea580c', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, lineHeight: 1.1, boxShadow: '0 2px 8px rgba(234,88,12,0.5)' }}>
            <span>{ad.discount_pct}%</span><span style={{ fontSize: 9 }}>OFF</span>
          </div>
        )}
        {ad.headline && (
          <p style={{ position: 'absolute', bottom: 12, left: 14, right: 14, color: '#fff', fontSize: 18, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {ad.headline}
          </p>
        )}
      </div>

      {/* Benefits row */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 12px 8px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
        {benefits.map((b) => (
          <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14 }}>{BENEFIT_ICONS[b] || '✅'}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textAlign: 'center', maxWidth: 58, lineHeight: 1.2 }}>{b}</span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#555', background: '#f3f4f6', padding: '2px 7px', borderRadius: 4 }}>Ad</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{ad.seller_name}</span>
        </div>
        {rating > 0 && <StarRating rating={rating} />}
        <h4 style={{ fontSize: 17, fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.3 }}>
          {ad.product_name || ad.title}
        </h4>
        {hasDiscount && <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, margin: 0 }}>Big Discount – Save {ad.discount_pct}%!</p>}
        {hasPrice && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#111' }}>R{ad.sale_price!.toFixed(2)}</span>
            {ad.original_price && ad.original_price > ad.sale_price! && (
              <span style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>R{ad.original_price.toFixed(2)}</span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>⏱️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>Limited time – Shop now!</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 16px 16px' }}>
        <button style={{
          width: '100%',
          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
          color: '#fff', border: 'none',
          padding: '12px 0', borderRadius: 10,
          fontWeight: 800, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
        }}>
          Shop Now <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>
    </div>
  );
}

/* ── MAIN CAROUSEL ── */
export function AdCarousel() {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    supabase
      .from('advertisements')
      .select('*')
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (!error && data) setAds(data);
      });
  }, []);

  if (ads.length === 0) return null;

  return (
    <div style={{ width: '100%', padding: '24px 0 28px', background: 'linear-gradient(180deg,#f0fdf4 0%,#f8fafc 100%)' }}>
      <div className="container">
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 18 }}>📢</span>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            Sponsored Deals
          </h3>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 10px', borderRadius: 20 }}>
            {ads.length} live
          </span>
        </div>

        {/* Layout: single ad = featured wide card, 2+ = responsive grid */}
        {ads.length === 1 ? (
          <FeaturedAd ad={ads[0]} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: ads.length === 2 ? '1fr 1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
          </div>
        )}
      </div>

      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
