'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { addProduct } from './actions';
import Link from 'next/link';
import { getSession } from '../login/actions';
import { useRouter } from 'next/navigation';
import TopNavProfile from '@/components/TopNavProfile';

import { Suspense, useEffect } from 'react';

const CATEGORIES = [
  { value: 'fruit-veg', label: '🥦 Fruit & Veg' },
  { value: 'meat-poultry', label: '🥩 Butchery' },
  { value: 'bakery', label: '🍞 Bakery' },
  { value: 'dairy', label: '🥛 Dairy & Eggs' },
  { value: 'pantry', label: '🫙 Artisan Pantry' },
  { value: 'beverages', label: '☕ Beverages' },
  { value: 'sweets', label: '🍬 Confectionery' },
  { value: 'frozen', label: '🧊 Frozen Foods' },
];

function OnboardingContent() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  useEffect(() => {
    getSession().then((res) => {
      if (!res.success || !res.vendorName) {
        router.push('/login');
        return;
      }
      setVendorName(res.vendorName);
    });
  }, [router]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | string>('idle');
  const [selectedCat, setSelectedCat] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [unit, setUnit] = useState('');
  const [stock, setStock] = useState('50');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMagicFill = async () => {
    if (!title) {
       alert("Please type a product name in the 'Display Name' field first!");
       return;
    }
    const t = title.toLowerCase();
    
    const MAGIC_DB = [
      { keys: ['apple', 'apples', 'granny smith', 'gala', 'golden delicious'], cat: 'fruit-veg', unit: '1.5kg bag', desc: 'Freshly picked, crisp and sweet apples sourced directly from local orchards. Perfect for snacking, baking, or school lunches.', price: '34.99' },
      { keys: ['chicken', 'breast', 'fillet', 'poultry'], cat: 'meat-poultry', unit: '1kg tray', desc: 'Premium lean chicken breast fillets. Hormone-free and trimmed, ready for grilling, roasting, or stir-fries.', price: '89.99' },
      { keys: ['milk', 'dairy', 'full cream', 'skim'], cat: 'dairy', unit: '2L bottle', desc: 'Farm fresh dairy milk, pasteurised and homogenised. Naturally rich in calcium and essential vitamins.', price: '32.99' },
      { keys: ['bread', 'loaf', 'sourdough', 'ciabatta', 'bakery'], cat: 'bakery', unit: '1 loaf (700g)', desc: 'Artisan baked bread with a beautifully crisp crust and a soft, airy center. Baked fresh daily.', price: '24.99' },
      { keys: ['beef', 'steak', 'mince'], cat: 'meat-poultry', unit: '500g', desc: 'High-quality A-grade beef, perfectly cut and intensely flavourful. Ideal for a classic braai or hearty family meals.', price: '120.00' },
      { keys: ['egg', 'eggs'], cat: 'dairy', unit: '18 Extra Large', desc: 'Farm fresh extra large eggs from free-roaming hens. Rich, golden yolks perfect for breakfast.', price: '54.99' },
      { keys: ['potato', 'potatoes', 'spud'], cat: 'fruit-veg', unit: '2kg bag', desc: 'Versatile, earthy potatoes perfect for mashing, roasting, or making homemade chips.', price: '45.00' },
      { keys: ['water', 'still', 'sparkling'], cat: 'beverages', unit: '5L bottle', desc: 'Pure, refreshing spring water filtered naturally over decades. Crisp and hydrating.', price: '25.00' },
      { keys: ['chocolate', 'sweet', 'candy'], cat: 'sweets', unit: '150g bar', desc: 'Decadent imported milk chocolate. Smooth, creamy, and melts perfectly in your mouth.', price: '39.99' }
    ];

    let match = MAGIC_DB.find(m => m.keys.some(k => t.includes(k)));
    if (!match) {
       // generic fallback
       match = { keys: [], cat: 'pantry', unit: '1 ea', desc: `Premium quality ${title}. Sourced from our trusted suppliers to guarantee freshness and value.`, price: '49.99' };
    }

    setDesc(match.desc);
    setSelectedCat(match.cat);
    setUnit(match.unit);
    setBasePrice(match.price);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setResult('idle');
    setUploadProgress('');

    const formData = new FormData(e.currentTarget);

    // ─── Upload image via our server-side API route ────────────────────────
    let imageUrl = '';
    if (!imageFile || imageFile.size === 0) {
      setResult('error:An image is required to list a product.');
      setIsSubmitting(false);
      return;
    }

    if (imageFile && imageFile.size > 0) {
      setUploadProgress('Uploading image...');

      const uploadForm = new FormData();
      uploadForm.set('file', imageFile);
      uploadForm.set('vendorName', vendorName);

      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadResult = await uploadRes.json();

      if (!uploadResult.success) {
        setResult('error:Failed to upload image: ' + uploadResult.error);
        setIsSubmitting(false);
        setUploadProgress('');
        return;
      }

      imageUrl = uploadResult.url;
      setUploadProgress('Image uploaded ✓');
    }

    // Pass the image URL (not the file) to the server action
    formData.set('imageUrl', imageUrl);
    formData.delete('imageFile'); // remove the file blob

    const res = await addProduct(formData);
    setIsSubmitting(false);
    setUploadProgress('');

    if (res.success) {
      setResult('success');
      (e.target as HTMLFormElement).reset();
      setTitle('');
      setDesc('');
      setBasePrice('');
      setUnit('');
      setStock('50');
      setSelectedCat('');
      setImagePreview(null);
      setImageFile(null);
    } else {
      setResult('error:' + res.error);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  const inp: React.CSSProperties = { width: '100%', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', color: '#0f172a', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.2s' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.02em' };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Top Nav */}
      <div className="dashboard-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
           <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)', color: '#fff', fontWeight: 900, fontSize: '18px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, boxShadow: '0 4px 10px rgba(15,23,42,0.2)' }}>DM</div>
           <div className="dashboard-header-brand-text">
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a', letterSpacing: '-0.3px' }}>Seller Center</div>
              <div style={{ fontSize: '9px', color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>New Listing</div>
           </div>
        </Link>

        {vendorName && <TopNavProfile vendorName={vendorName} />}
      </div>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 16px', marginBottom: 20 }}>DASHBOARD</div>
          {[
            { href: '/products', icon: '🛍️', label: 'Storefront Inventory', active: false },
            { href: '/orders', icon: '📦', label: 'Customer Orders', active: false },
            { href: '/onboarding', icon: '➕', label: 'List New Product', active: true },
            { href: '/profile', icon: '🏪', label: 'Store Profile & Settings', active: false },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, textDecoration: 'none', fontSize: '14px', fontWeight: item.active ? 800 : 500, background: item.active ? '#f1f5f9' : 'transparent', color: item.active ? '#0f172a' : '#64748b', border: item.active ? '1px solid #cbd5e1' : '1px solid transparent', marginBottom: 6 }}>
              <span style={{ fontSize: 18, opacity: item.active ? 1 : 0.7 }}>{item.icon}</span> {item.label}
            </Link>
          ))}
        </aside>

        {/* Content */}
        <div className="dashboard-main">
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
               <div style={{ display: 'inline-flex', padding: '6px 14px', background: '#f1f5f9', borderRadius: 30, fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                MARKETPLACE ASSET
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0f172a', marginBottom: 8 }}>List New Product</h1>
              <p style={{ color: '#64748b', fontSize: '16px' }}>Provide accurate details to ensure your product reaches the right elite customers.</p>
            </div>

            <div className="premium-card">
              <div style={{ background: 'linear-gradient(to right, #0f172a, #000000)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 Product Specifications</span>
              </div>
              <div style={{ padding: '40px 32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <input type="hidden" name="vendorName" value={vendorName} />

                  {/* Image Upload */}
                  <div className="flex-between-responsive" style={{ padding: '24px', background: '#f8fafc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: 140, height: 140, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative', transition: 'border-color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#0f172a'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                     >
                        {imagePreview ? <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                              <circle cx="9" cy="9" r="2"/>
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                           </svg>
                        )}
                        <div style={{ position: 'absolute', bottom: 8, background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: 20, fontSize: '10px', fontWeight: 900, color: '#0f172a', border: '1px solid #e2e8f0' }}>CLICK TO UPLOAD</div>
                     </div>
                     <div style={{ flex: 1 }}>
                        <label style={lbl}>Product Visual *</label>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 12 }}>High-resolution photos increase sales by 40%. JPG or PNG recommended.</p>
                        <input
                          type="file"
                          name="imageFile"
                          accept="image/*"
                          onChange={handleImageChange}
                          required
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                        />
                        {uploadProgress && (
                          <div style={{ marginTop: 8, fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{uploadProgress}</div>
                        )}
                        {!imagePreview && !uploadProgress && (
                           <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', fontFamily: 'inherit' }}>
                              Choose Image
                           </button>
                        )}
                     </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                  {/* Title and Magic Fill */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                       <label style={{...lbl, marginBottom: 0}} htmlFor="title">Display Name *</label>
                       <button 
                          type="button" 
                          onClick={handleMagicFill}
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(16,185,129,0.3)' }}>
                          ✨ MAGIC FILL
                       </button>
                    </div>
                    <input id="title" name="title" type="text" value={title || ''} onChange={e => setTitle(e.target.value)} required spellCheck={true} autoCorrect="on" style={inp} placeholder="e.g. Granny Smith Apples" />
                  </div>
                  <div>
                    <label style={lbl} htmlFor="description">Marketplace Description *</label>
                    <textarea id="description" name="description" value={desc || ''} onChange={e => setDesc(e.target.value)} required rows={4} spellCheck={true} autoCorrect="on" style={{ ...inp, resize: 'none' }} placeholder="Describe the origin, taste, and quality of your product..." />
                  </div>
                </div>

                <div>
                  <label style={lbl}>Gallery Category *</label>
                  <div className="category-grid">
                    {CATEGORIES.map(cat => (
                        <label key={cat.value} style={{ cursor: 'pointer' }}>
                          <input type="radio" name="category" value={cat.value} checked={selectedCat === cat.value} onChange={() => setSelectedCat(cat.value)} required style={{ display: 'none' }} />
                          <div style={{ background: selectedCat === cat.value ? '#f1f5f9' : '#f8fafc', border: selectedCat === cat.value ? '2px solid #0f172a' : '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: selectedCat === cat.value ? '#0f172a' : '#64748b', transition: 'all 0.2s' }}>
                            {cat.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="stat-grid" style={{ marginBottom: 0, gap: 20 }}>
                    <div>
                      <label style={lbl} htmlFor="basePrice">Your Price (EFT Payout) *</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 16, top: 14, fontWeight: 800, color: '#64748b' }}>R</span>
                        <input id="basePrice" name="basePrice" type="number" step="0.01" value={basePrice || ''} onChange={e => setBasePrice(e.target.value)} required style={{ ...inp, paddingLeft: 34 }} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label style={lbl} htmlFor="unit">Unit / Scale *</label>
                      <input id="unit" name="unit" type="text" value={unit || ''} onChange={e => setUnit(e.target.value)} required style={inp} placeholder="e.g. 500g / box" />
                    </div>
                    <div>
                      <label style={lbl} htmlFor="stock">Available Stock</label>
                      <input id="stock" name="stock" type="number" value={stock || ''} onChange={e => setStock(e.target.value)} style={inp} />
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 24 }}>💡</div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Elite Fulfilment Pricing</p>
                      <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                        We add a <strong>15% Marketplace Premium</strong> to your asking price. This covers logistics, cold chain storage, and premium delivery. You will always receive your full payout per unit sold.
                      </p>
                    </div>
                  </div>

                  <div className="form-actions">
                    <Link href={`/products`} style={{ padding: '16px 24px', borderRadius: 12, fontSize: '14px', fontWeight: 800, color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</Link>
                    <button type="submit" disabled={isSubmitting} style={{ background: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 32px', fontWeight: 800, fontSize: '14px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(15,23,42,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isSubmitting ? (uploadProgress || 'Publishing...') : '🚀 Publish Listing'}
                    </button>
                  </div>

                  {result === 'success' && (
                    <div style={{ padding: '24px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #86efac', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                       <div style={{ color: '#047857', fontSize: '15px', fontWeight: 800 }}>✓ Listing published to Marketplace!</div>
                       <Link href="/products" style={{ background: '#059669', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                         View in Storefront Inventory →
                       </Link>
                    </div>
                  )}
                  {typeof result === 'string' && result.startsWith('error:') && <div style={{ padding: '16px', borderRadius: 12, background: '#fff1f2', border: '1px solid #e11d48', color: '#9f1239', fontSize: '14px', fontWeight: 800, textAlign: 'center' }}>⚠️ {result.slice(6)}</div>}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link href={`/products`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🛍️</span>
          <span>Inventory</span>
        </Link>
        <Link href={`/orders`} className="mobile-nav-item">
          <span className="mobile-nav-icon">📦</span>
          <span>Orders</span>
        </Link>
        <Link href={`/onboarding`} className="mobile-nav-item active">
          <span className="mobile-nav-icon">➕</span>
          <span>List Item</span>
        </Link>
        <Link href={`/profile`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🏪</span>
          <span>Profile</span>
        </Link>
      </nav>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Loading marketplace asset...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
