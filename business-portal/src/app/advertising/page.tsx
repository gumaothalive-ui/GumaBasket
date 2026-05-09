'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession } from '../login/actions';
import { fetchAds, createAd } from './actions';
import { Suspense } from 'react';

const NAV = [
  { href: '/products',    icon: '▤', label: 'Products'    },
  { href: '/earnings',    icon: '↗', label: 'Earnings'    },
  { href: '/onboarding',  icon: '+', label: 'New product' },
  { href: '/advertising', icon: '📢', label: 'Advertising', active: true },
  { href: '/profile',     icon: '🏪', label: 'Store Profile & Settings'    },
];

const BENEFIT_OPTIONS = [
  '100% Natural', 'Farm Fresh', 'Locally Sourced',
  'Rich in Vitamins', 'Organic', 'No Additives',
  'Free Range', 'Whole Grain',
];

const BENEFIT_ICONS: Record<string, string> = {
  '100% Natural': '🌿', 'Farm Fresh': '🌱', 'Locally Sourced': '📍',
  'Rich in Vitamins': '❤️', 'Organic': '♻️', 'No Additives': '✅',
  'Free Range': '🐓', 'Whole Grain': '🌾',
};

/* ─────────────────────────────────────────────
   Mini live-preview card (mirrors AdCarousel)
───────────────────────────────────────────── */
function AdPreview({
  sellerName, productName, headline, imageUrl,
  originalPrice, salePrice, discountPct, starRating, benefitTags,
}: {
  sellerName: string; productName: string; headline: string;
  imageUrl: string; originalPrice: string; salePrice: string;
  discountPct: string; starRating: string; benefitTags: string[];
}) {
  const dp = Number(discountPct) || 0;
  const sp = Number(salePrice) || 0;
  const op = Number(originalPrice) || 0;
  const rating = Number(starRating) || 0;
  const benefits = benefitTags.length > 0 ? benefitTags.slice(0, 3) : ['100% Natural', 'Farm Fresh', 'Locally Sourced'];

  return (
    <div style={{ width: 260, borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', background: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', height: 160, background: '#e5e7eb', overflow: 'hidden' }}>
        {imageUrl && <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.15) 60%,transparent 100%)' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, background: '#16a34a', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>🌿 FARM FRESH</div>
        {dp > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 10, width: 44, height: 44, borderRadius: '50%', background: '#ea580c', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, lineHeight: 1.1 }}>
            <span>{dp}%</span><span style={{ fontSize: 8 }}>OFF</span>
          </div>
        )}
        {headline && (
          <p style={{ position: 'absolute', bottom: 10, left: 12, right: 12, color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{headline}</p>
        )}
      </div>

      {/* Benefits */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 10px 6px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
        {benefits.map((b) => (
          <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 12 }}>{BENEFIT_ICONS[b] || '✅'}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textAlign: 'center', maxWidth: 54, lineHeight: 1.2 }}>{b}</span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#555', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>Ad</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>{sellerName || 'Your Store'}</span>
        </div>
        {rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 11, color: i <= rating ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>({rating.toFixed(1)})</span>
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 800, color: '#111', lineHeight: 1.3 }}>{productName || 'Product Name'}</div>
        {dp > 0 && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Big Discount – Save {dp}%!</div>}
        {sp > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>R{sp.toFixed(2)}</span>
            {op > sp && <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>R{op.toFixed(2)}</span>}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11 }}>⏱️</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#ea580c' }}>Limited time – Shop now!</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', borderRadius: 8, padding: '9px 0', textAlign: 'center', fontWeight: 800, fontSize: 13 }}>
          Shop Now →
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
function AdvertisingContent() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<any[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle]             = useState('');
  const [productName, setProductName] = useState('');
  const [headline, setHeadline]       = useState('');
  const [tagline, setTagline]         = useState('');
  const [imageUrl, setImageUrl]       = useState('');
  const [budget, setBudget]           = useState('500');
  const [originalPrice, setOriginalPrice] = useState('');
  const [salePrice, setSalePrice]         = useState('');
  const [discountPct, setDiscountPct]     = useState('');
  const [starRating, setStarRating]       = useState('');
  const [benefitTags, setBenefitTags]     = useState<string[]>(['100% Natural', 'Farm Fresh', 'Locally Sourced']);
  const [ctaUrl, setCtaUrl]               = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // File upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSession().then((res) => {
      if (!res.success || !res.vendorName) { router.push('/login'); return; }
      setVendorName(res.vendorName);
    });
  }, [router]);

  useEffect(() => { if (vendorName) loadAds(); }, [vendorName]);

  const loadAds = async () => {
    const res = await fetchAds(vendorName);
    if (res.demo) setDemoMode(true);
    if (res.success && res.ads) setAds(res.ads);
    setLoading(false);
  };

  const toggleBenefit = (b: string) => {
    setBenefitTags(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : prev.length < 3 ? [...prev, b] : prev
    );
  };

  // Auto-compute discount when prices change
  useEffect(() => {
    const op = Number(originalPrice);
    const sp = Number(salePrice);
    if (op > 0 && sp > 0 && sp < op) {
      setDiscountPct(String(Math.round(((op - sp) / op) * 100)));
    }
  }, [originalPrice, salePrice]);

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!imageUrl && !imageFile)) return alert('Please fill title and provide an image');
    setSubmitting(true);

    let finalImageUrl = imageUrl;
    if (imageFile && imageFile.size > 0) {
      setUploadProgress('Uploading image...');
      const uploadForm = new FormData();
      uploadForm.set('file', imageFile);
      uploadForm.set('vendorName', vendorName);
      try {
        const r = await fetch('/api/upload-image', { method: 'POST', body: uploadForm });
        const result = await r.json();
        if (!result.success) { alert('Upload failed: ' + result.error); setSubmitting(false); setUploadProgress(''); return; }
        finalImageUrl = result.url;
        setUploadProgress('Image uploaded ✓');
      } catch { alert('Error uploading image'); setSubmitting(false); setUploadProgress(''); return; }
    }

    const res = await createAd(vendorName, {
      title, tagline, image_url: finalImageUrl, total_budget: Number(budget),
      product_name: productName, headline,
      original_price: Number(originalPrice) || undefined,
      sale_price: Number(salePrice) || undefined,
      discount_pct: Number(discountPct) || undefined,
      star_rating: Number(starRating) || undefined,
      benefit_tags: benefitTags,
      cta_url: ctaUrl || undefined,
    });

    setSubmitting(false);
    setUploadProgress('');
    if (res.success) {
      setShowForm(false);
      setTitle(''); setProductName(''); setHeadline(''); setTagline('');
      setImageUrl(''); setImageFile(null); setImagePreview(null);
      setOriginalPrice(''); setSalePrice(''); setDiscountPct('');
      setStarRating(''); setBenefitTags(['100% Natural', 'Farm Fresh', 'Locally Sourced']); setCtaUrl('');
      loadAds();
    } else {
      alert('Error: ' + res.error);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none',
    fontFamily: "'Inter', sans-serif", color: '#111', background: '#fff',
    boxSizing: 'border-box' as const,
  };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', marginBottom: 6 } as const;

  return (
    <main style={{ minHeight: '100vh', background: '#F8F8F8', color: '#111', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EAEAEA', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '36px', width: 'auto' }} />
        </Link>
        {vendorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F5F5F5', padding: '6px 14px', borderRadius: 20, border: '1px solid #EAEAEA' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{vendorName}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDEBAR */}
        <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #EAEAEA', padding: '28px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#C0C0C0', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 12 }}>Menu</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: '13px', fontWeight: item.active ? 700 : 500, background: item.active ? '#F0F0F0' : 'transparent', color: item.active ? '#111' : '#888', marginBottom: 4 }}>
              <span style={{ fontSize: '14px', fontWeight: 700, width: 18, textAlign: 'center', color: item.active ? '#111' : '#bbb' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.8px', color: '#111', marginBottom: 4 }}>Advertising & Promotions</h1>
                <p style={{ color: '#aaa', fontSize: '14px' }}>Boost your store visibility and acquire new customers.</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{ background: '#111', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                {showForm ? 'Cancel' : '+ New Campaign'}
              </button>
            </div>

            {/* Demo mode warning */}
            {demoMode && (
              <div style={{ padding: '14px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, fontSize: '13px', color: '#92400E', fontWeight: 500, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>⚠️</span>
                <span>The <code style={{ fontWeight: 800 }}>advertisements</code> table hasn&apos;t been set up yet. Run <code style={{ background: '#FEF9C3', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700 }}>upgrade_advertisements.sql</code> in your Supabase SQL editor.</span>
              </div>
            )}

            {/* ── CREATE AD FORM ── */}
            {showForm && !demoMode && (
              <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 20, padding: '36px', marginBottom: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: 28, color: '#111' }}>Create Ad Campaign</h3>

                <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
                  {/* Form fields */}
                  <form onSubmit={handleCreateAd} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Row: Internal title + Product name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Campaign Title (Internal) *</label>
                        <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Carrot Summer Sale" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Product Name (Shown on ad)</label>
                        <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Fresh Carrots" style={inputStyle} />
                      </div>
                    </div>

                    {/* Headline */}
                    <div>
                      <label style={labelStyle}>Headline (Big overlay text on image)</label>
                      <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Crisp. Sweet. Naturally Fresh." style={inputStyle} />
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: 4 }}>Keep it short and punchy — 3–6 words work best.</p>
                    </div>

                    {/* Tagline */}
                    <div>
                      <label style={labelStyle}>Tagline (Subtitle under headline)</label>
                      <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Premium quality farm-fresh carrots" style={inputStyle} />
                    </div>

                    {/* Image upload */}
                    <div>
                      <label style={labelStyle}>Product Image *</label>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{ width: 100, height: 100, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                        >
                          {imagePreview
                            ? <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : imageUrl
                              ? <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 28, color: '#ccc' }}>📷</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setImageFile(file); setImageUrl('');
                                const reader = new FileReader();
                                reader.onloadend = () => setImagePreview(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: '#111', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                            Upload File
                          </button>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, margin: '6px 0' }}>OR PASTE A URL:</div>
                          <input value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImageFile(null); setImagePreview(null); }} placeholder="https://..." style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
                          {uploadProgress && <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, marginTop: 8 }}>{uploadProgress}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Pricing row */}
                    <div>
                      <label style={labelStyle}>Pricing</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: 4 }}>Original Price (R)</div>
                          <input type="number" min="0" step="0.01" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="e.g. 8.99" style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: 4 }}>Sale Price (R)</div>
                          <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="e.g. 5.39" style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: 4 }}>Discount % (auto)</div>
                          <input type="number" min="0" max="100" value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="e.g. 40" style={{ ...inputStyle, background: '#f8fafc' }} />
                        </div>
                      </div>
                    </div>

                    {/* Star rating + Budget */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Star Rating (0–5)</label>
                        <input type="number" min="0" max="5" step="0.1" value={starRating} onChange={e => setStarRating(e.target.value)} placeholder="e.g. 4.8" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Total Budget (R) *</label>
                        <input required type="number" value={budget} onChange={e => setBudget(e.target.value)} style={inputStyle} />
                      </div>
                    </div>

                    {/* Benefit tags */}
                    <div>
                      <label style={labelStyle}>Benefit Tags (pick up to 3)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {BENEFIT_OPTIONS.map(b => {
                          const selected = benefitTags.includes(b);
                          return (
                            <button
                              key={b} type="button"
                              onClick={() => toggleBenefit(b)}
                              style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                border: selected ? '2px solid #16a34a' : '2px solid #e5e7eb',
                                background: selected ? '#dcfce7' : '#fff',
                                color: selected ? '#15803d' : '#6b7280',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {BENEFIT_ICONS[b]} {b}
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: 6 }}>These appear as small icons on your ad card.</p>
                    </div>

                    {/* CTA URL */}
                    <div>
                      <label style={labelStyle}>Link when customer clicks ad (optional)</label>
                      <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://gumabasket.com/stores/your-store" style={inputStyle} />
                    </div>

                    <button
                      disabled={submitting}
                      style={{ background: '#05a357', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 8, fontSize: '15px' }}
                    >
                      {submitting ? 'Launching...' : '🚀 Launch Campaign'}
                    </button>
                  </form>

                  {/* Live preview */}
                  <div style={{ flexShrink: 0, position: 'sticky', top: 80 }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>Live Preview</div>
                    <AdPreview
                      sellerName={vendorName}
                      productName={productName}
                      headline={headline}
                      imageUrl={imagePreview || imageUrl}
                      originalPrice={originalPrice}
                      salePrice={salePrice}
                      discountPct={discountPct}
                      starRating={starRating}
                      benefitTags={benefitTags}
                    />
                    <p style={{ fontSize: '10px', color: '#bbb', textAlign: 'center', marginTop: 10 }}>Preview updates as you type</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── ADS LIST ── */}
            {loading ? (
              <p style={{ color: '#aaa' }}>Loading campaigns...</p>
            ) : ads.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ads.map(ad => (
                  <div key={ad.id} style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'stretch', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 200, background: '#f5f5f5', backgroundImage: `url(${ad.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                    <div style={{ padding: '24px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ display: 'inline-block', padding: '4px 10px', background: ad.status === 'active' ? '#ecfdf5' : '#f1f5f9', color: ad.status === 'active' ? '#10b981' : '#64748b', fontSize: '11px', fontWeight: 800, borderRadius: 20, textTransform: 'uppercase' }}>
                              {ad.status}
                            </div>
                            {ad.discount_pct > 0 && (
                              <div style={{ display: 'inline-block', padding: '4px 10px', background: '#fff7ed', color: '#ea580c', fontSize: '11px', fontWeight: 800, borderRadius: 20 }}>
                                {ad.discount_pct}% OFF
                              </div>
                            )}
                          </div>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: 4 }}>{ad.product_name || ad.title}</h3>
                          {ad.headline && <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', marginBottom: 4 }}>&ldquo;{ad.headline}&rdquo;</p>}
                          {ad.tagline && <p style={{ color: '#666', fontSize: '13px' }}>{ad.tagline}</p>}
                          {(ad.sale_price > 0 || ad.original_price > 0) && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                              {ad.sale_price > 0 && <span style={{ fontSize: '18px', fontWeight: 900 }}>R{Number(ad.sale_price).toFixed(2)}</span>}
                              {ad.original_price > 0 && <span style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'line-through' }}>R{Number(ad.original_price).toFixed(2)}</span>}
                            </div>
                          )}
                          {ad.benefit_tags && ad.benefit_tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                              {ad.benefit_tags.map((b: string) => (
                                <span key={b} style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 12 }}>
                                  {BENEFIT_ICONS[b]} {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Spent / Budget</div>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>R{ad.amount_spent} <span style={{ color: '#aaa', fontWeight: 500 }}>/ R{ad.total_budget}</span></div>
                        </div>
                      </div>
                      <div style={{ marginTop: 20, display: 'flex', gap: 28, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>IMPRESSIONS</div>
                          <div style={{ fontSize: '20px', fontWeight: 900 }}>{ad.impressions || 0}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>CLICKS</div>
                          <div style={{ fontSize: '20px', fontWeight: 900 }}>{ad.clicks || 0}</div>
                        </div>
                        {ad.clicks > 0 && ad.impressions > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>CTR</div>
                            <div style={{ fontSize: '20px', fontWeight: 900 }}>{((ad.clicks / ad.impressions) * 100).toFixed(1)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !demoMode ? (
              <div style={{ background: '#fff', border: '1px dashed #EAEAEA', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: 16 }}>📢</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: 8 }}>No active campaigns</h3>
                <p style={{ color: '#aaa', fontSize: '14px', maxWidth: 400, margin: '0 auto 24px' }}>Launch a campaign to feature your products on the Guma Basket homepage with rich ad cards.</p>
                <button onClick={() => setShowForm(true)} style={{ background: '#111', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                  Create Campaign
                </button>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdvertisingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center' }}>Loading...</div>}>
      <AdvertisingContent />
    </Suspense>
  );
}
