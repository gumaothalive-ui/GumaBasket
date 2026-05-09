'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveBankDetails, saveStoreLogo, getStoreLogo, saveBusinessHours, getBusinessHours, saveSellerPhone, getSellerPhone, saveStoreAddress, getStoreAddress } from './actions';
import Link from 'next/link';
import { getSession } from '../login/actions';
import { useRouter } from 'next/navigation';
import TopNavProfile from '@/components/TopNavProfile';

import { Suspense, useEffect, useRef } from 'react';

function ProfileContent() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | string>('idle');
  const [logoState, setLogoState] = useState<'idle' | 'uploading' | 'success' | string>('idle');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('17:00');
  const [hoursResult, setHoursResult] = useState<'idle' | 'success' | string>('idle');
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [sellerPhone, setSellerPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneResult, setPhoneResult] = useState<'idle' | 'success' | string>('idle');
  const [storeAddress, setStoreAddress] = useState('');
  const [locationLink, setLocationLink] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressResult, setAddressResult] = useState<'idle' | 'success' | string>('idle');
  const [osmLoading, setOsmLoading] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSession().then((res) => {
      if (!res.success || !res.vendorName) {
        router.push('/login');
        return;
      }
      setVendorName(res.vendorName);
      getStoreLogo(res.vendorName).then(logoRes => {
        if (logoRes.success && logoRes.logoUrl) {
          setCurrentLogo(logoRes.logoUrl);
        }
      });
      getBusinessHours(res.vendorName).then(hoursRes => {
        if (hoursRes.success && hoursRes.openingTime) {
          setOpeningTime(hoursRes.openingTime);
          setClosingTime(hoursRes.closingTime ?? '18:00');
        }
      });
      getSellerPhone(res.vendorName).then(phoneRes => {
        if (phoneRes.success && phoneRes.phone) setSellerPhone(phoneRes.phone);
      });
      getStoreAddress(res.vendorName).then(addressRes => {
        if (addressRes.success) {
          if (addressRes.address) setStoreAddress(addressRes.address);
          if (addressRes.locationLink) setLocationLink(addressRes.locationLink);
          if (addressRes.latitude) setLatitude(addressRes.latitude.toString());
          if (addressRes.longitude) setLongitude(addressRes.longitude.toString());
        }
      });
    });
  }, [router]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoState('uploading');
    
    // 1. Upload file via our API route
    const uploadForm = new FormData();
    uploadForm.set('file', file);
    uploadForm.set('vendorName', vendorName + '-logo');

    try {
      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadResult = await uploadRes.json();

      if (!uploadResult.success) {
        setLogoState('error:' + uploadResult.error);
        return;
      }

      // 2. Save URL to the sellers table
      const saveRes = await saveStoreLogo(vendorName, uploadResult.url);
      if (!saveRes.success) {
        setLogoState('error:' + saveRes.error);
        return;
      }

      // 3. Success
      setCurrentLogo(uploadResult.url);
      setLogoState('success');
      setTimeout(() => setLogoState('idle'), 3000);
    } catch (err: any) {
      setLogoState('error:Upload failed');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setIsSubmitting(true); setResult('idle');
    const formData = new FormData(e.currentTarget);
    const res = await saveBankDetails(formData);
    setIsSubmitting(false);
    if (res.success) setResult('success'); else setResult('error:' + res.error);
  }

  const inp: React.CSSProperties = { width: '100%', background: '#fafafa', border: '1.5px solid #e8e8e8', borderRadius: 8, padding: '14px 18px', color: '#1a1a1a', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: 7 };

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {/* Top Nav */}
      <div className="dashboard-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ background: '#0f172a', color: '#fff', fontWeight: 900, fontSize: '16px', padding: '3px 9px', borderRadius: 5 }}>DM</div>
          <span className="dashboard-header-brand-text" style={{ fontWeight: 800, fontSize: '15px', color: '#1a1a1a' }}>Seller Center</span>
        </Link>
        {vendorName && <TopNavProfile vendorName={vendorName} />}
      </div>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 10 }}>Menu</div>
          {[
            { href: '/products', icon: '🛍️', label: 'Storefront Inventory', active: false },
            { href: '/orders', icon: '📦', label: 'Customer Orders', active: false },
            { href: '/onboarding', icon: '➕', label: 'List New Product', active: false },
            { href: '/profile', icon: '🏪', label: 'Store Profile & Settings', active: true },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 8, textDecoration: 'none', fontSize: '14px', fontWeight: item.active ? 700 : 500, background: item.active ? '#f1f5f9' : 'transparent', color: item.active ? '#0f172a' : '#666', borderLeft: item.active ? '3px solid #0f172a' : '3px solid transparent', marginBottom: 2 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
            </Link>
          ))}
        </aside>

        {/* Content */}
        <div className="dashboard-main">
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', color: '#1a1a1a', margin: '0 0 4px 0' }}>Store Settings</h1>
              <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>Configure your brand identity, business hours, and payout methods.</p>
            </div>

            {/* Store Brand Identity */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ background: '#0f172a', padding: '14px 24px', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                🏪 Store Brand Identity
              </div>
              <div className="flex-between-responsive" style={{ padding: '24px', alignItems: 'flex-start' }}>
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: 100, height: 100, background: '#f8fafc', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative' }}
                 >
                    {currentLogo ? (
                      <img src={currentLogo} alt="Store Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '32px' }}>🏪</span>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.8)', color: '#fff', fontSize: '9px', fontWeight: 800, textAlign: 'center', padding: '4px 0' }}>EDIT LOGO</div>
                 </div>
                 
                 <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Store Logo</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', maxWidth: 400 }}>
                      This image will be displayed on the Cash & Carry marketplace homepage and your dedicated store page.
                    </p>
                    
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
                    
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={logoState === 'uploading'} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: '13px', cursor: logoState === 'uploading' ? 'wait' : 'pointer' }}>
                      {logoState === 'uploading' ? 'Uploading...' : 'Upload New Logo'}
                    </button>
                    
                    {logoState === 'success' && <span style={{ marginLeft: 12, fontSize: '13px', fontWeight: 700, color: '#10b981' }}>✓ Saved to database</span>}
                    {typeof logoState === 'string' && logoState.startsWith('error:') && (
                        <div style={{ marginTop: 12, fontSize: '12px', fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca' }}>
                            {logoState.slice(6)}
                        </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Payout Settings */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
              <div style={{ background: '#0f172a', padding: '14px 24px', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                🏦 South African Banking Details
              </div>
              
              <div style={{ padding: '28px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className="stat-grid" style={{ gap: 16, marginBottom: 0 }}>
                    <div><label style={lbl} htmlFor="email">Email Address</label><input id="email" name="email" type="email" required style={inp} placeholder="seller@example.com" /></div>
                    <div><label style={lbl} htmlFor="vendorName">Business Name</label><input id="vendorName" name="vendorName" type="text" defaultValue={vendorName} style={inp} /></div>
                  </div>

                  <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 24 }}>
                    <div className="stat-grid" style={{ gap: 16, marginBottom: 16 }}>
                      <div><label style={lbl} htmlFor="bankName">Bank Name</label><input id="bankName" name="bankName" type="text" required style={inp} placeholder="e.g. FNB, Capitec" /></div>
                      <div><label style={lbl} htmlFor="branchCode">Branch Code</label><input id="branchCode" name="branchCode" type="text" required style={inp} placeholder="e.g. 250655" /></div>
                    </div>
                    <div><label style={lbl} htmlFor="accountNumber">Account Number</label><input id="accountNumber" name="accountNumber" type="text" required style={{ ...inp, letterSpacing: '2px', fontWeight: 700, fontSize: '16px' }} placeholder="0000000000" /></div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🔒</span>
                    <span style={{ color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                      Your information is encrypted and stored securely for EFT payouts only.
                    </span>
                  </div>

                  <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? '#fbbf80' : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '15px', fontWeight: 800, fontSize: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.3)' }}>
                    {isSubmitting ? 'Saving Details...' : '💾 Save Banking Details'}
                  </button>

                  {result === 'success' && <div style={{ padding: '14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>✓ Settings updated successfully!</div>}
                  {typeof result === 'string' && result.startsWith('error:') && <div style={{ padding: '14px', borderRadius: 8, background: '#fff8f8', border: '1px solid #ffdcdc', color: '#e53e3e', fontSize: '14px' }}>⨯ {result.slice(6)}</div>}
                </form>
              </div>
            </div>

            {/* --- SMS Notification Number --- */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginTop: 24 }}>
              <div style={{ background: '#0f172a', padding: '14px 24px', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                📲 SMS Order Notifications
              </div>
              <div style={{ padding: '28px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                  Enter your cellphone number to receive an SMS instantly whenever a new order arrives.
                </p>
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl} htmlFor="sellerPhone">Your Cellphone Number (SA)</label>
                  <input
                    id="sellerPhone"
                    type="tel"
                    value={sellerPhone}
                    onChange={e => setSellerPhone(e.target.value)}
                    placeholder="e.g. 0797140276 or +27797140276"
                    style={inp}
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setPhoneSaving(true); setPhoneResult('idle');
                    const res = await saveSellerPhone(vendorName, sellerPhone);
                    setPhoneSaving(false);
                    if (res.success) setPhoneResult('success');
                    else setPhoneResult('error:' + res.error);
                  }}
                  disabled={phoneSaving || !vendorName}
                  style={{ background: phoneSaving ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '15px', fontWeight: 800, fontSize: '15px', cursor: phoneSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.3)' }}
                >
                  {phoneSaving ? 'Saving...' : '💾 Save Notification Number'}
                </button>
                {phoneResult === 'success' && <div style={{ marginTop: 16, padding: '14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>✅ Number saved! You&apos;ll get SMS alerts on new orders.</div>}
                {typeof phoneResult === 'string' && phoneResult.startsWith('error:') && <div style={{ marginTop: 16, padding: '14px', borderRadius: 8, background: '#fff8f8', border: '1px solid #ffdcdc', color: '#e53e3e', fontSize: '13px' }}>⨯ {phoneResult.slice(6)}</div>}
              </div>
            </div>

            {/* --- Store Location --- */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginTop: 24 }}>
              <div style={{ background: '#0f172a', padding: '14px 24px', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                📍 Store Location
              </div>
              <div style={{ padding: '28px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.6 }}>
                  Stand inside your store and tap the button below — we&apos;ll pin your exact location automatically.
                </p>

                {/* Custom Permission Modal */}
                {showLocationPrompt && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 30, maxWidth: 400, width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                        <div style={{ width: 64, height: 64, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📍</div>
                      </div>
                      <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', fontSize: 20, color: '#0f172a' }}>Allow Location Access</h3>
                      <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.5 }}>
                        To automatically pin your store, we need access to your current location. Your browser will ask for permission next. Please click <strong>"Allow"</strong>.
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setShowLocationPrompt(false)}
                          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLocationPrompt(false);
                            if (!navigator.geolocation) {
                              alert('Your browser does not support GPS location. Please use a modern browser on your phone.');
                              return;
                            }
                            setOsmLoading(true);
                            navigator.geolocation.getCurrentPosition(
                              async (pos) => {
                                const lat = pos.coords.latitude.toString();
                                const lon = pos.coords.longitude.toString();
                                setLatitude(lat);
                                setLongitude(lon);
                                setLocationLink(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`);
                                try {
                                  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
                                  const d = await r.json();
                                  setStoreAddress(d.display_name || `${lat}, ${lon}`);
                                } catch {
                                  setStoreAddress(`${lat}, ${lon}`);
                                }
                                setLocationConfirmed(true);
                                setOsmLoading(false);
                              },
                              (err) => {
                                setOsmLoading(false);
                                if (err.code === 1) alert('Location permission denied. Please allow location access in your browser/phone settings and try again.');
                                else if (err.code === 2) alert('Could not detect your location. Make sure GPS is turned on.');
                                else alert('Location timed out. Please try again.');
                              },
                              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                            );
                          }}
                          style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* GPS Button */}
                <button
                  type="button"
                  onClick={() => setShowLocationPrompt(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    width: '100%', padding: '16px', borderRadius: 12,
                    background: locationConfirmed ? '#f0fdf4' : '#0f172a',
                    color: locationConfirmed ? '#15803d' : '#fff',
                    border: locationConfirmed ? '1.5px solid #86efac' : 'none',
                    fontWeight: 800, fontSize: '15px', cursor: osmLoading ? 'wait' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s'
                  } as React.CSSProperties}
                >
                  {osmLoading ? (
                    <><span style={{ fontSize: 20 }}>⟳</span> Detecting your location...</>
                  ) : locationConfirmed ? (
                    <><span style={{ fontSize: 20 }}>✅</span> Location detected — tap to update</>
                  ) : (
                    <><span style={{ fontSize: 20 }}>📡</span> Detect My Store Location</>
                  )}
                </button>

                {/* Fallback for when GPS is denied */}
                {!showManualAddress && !locationConfirmed && (
                  <button
                    type="button"
                    onClick={() => setShowManualAddress(true)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, marginTop: 16, width: '100%', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Can&apos;t use GPS? Enter address manually
                  </button>
                )}

                {showManualAddress && !locationConfirmed && (
                  <div style={{ marginTop: 24, padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Type exact street address</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        type="text"
                        value={storeAddress}
                        onChange={e => setStoreAddress(e.target.value)}
                        placeholder="45 Voortrekker Road, Bellville, 7530"
                        style={{ ...inp, flex: 1, borderRadius: 8, fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!storeAddress.trim()) return;
                          setOsmLoading(true);
                          try {
                            const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
                            let lat = '', lon = '';
                            if (mapboxToken) {
                              const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(storeAddress)}.json?access_token=${mapboxToken}&country=ZA&limit=1`);
                              const data = await res.json();
                              if (data.features?.[0]) {
                                lat = data.features[0].geometry.coordinates[1].toString();
                                lon = data.features[0].geometry.coordinates[0].toString();
                              }
                            } else {
                              const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(storeAddress)}&format=json&limit=1&countrycodes=za`);
                              const data = await res.json();
                              if (data[0]) { lat = data[0].lat; lon = data[0].lon; }
                            }
                            if (lat) {
                              setLatitude(lat); setLongitude(lon);
                              setLocationLink(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`);
                              setLocationConfirmed(true);
                            } else {
                              alert('Address not found. Please be more specific, e.g. include the street number and city.');
                            }
                          } catch { alert('Search failed. Try again.'); }
                          setOsmLoading(false);
                        }}
                        style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0 18px', borderRadius: 8, fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {osmLoading ? '...' : 'Find →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Map Preview */}
                {latitude && longitude && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>✅ Location confirmed</span>
                      <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=17`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#1a73e8', textDecoration: 'none' }}>Open in Maps ↗</a>
                    </div>
                    <iframe
                      title="Store Map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(longitude)-0.005},${parseFloat(latitude)-0.005},${parseFloat(longitude)+0.005},${parseFloat(latitude)+0.005}&layer=mapnik&marker=${latitude},${longitude}`}
                      style={{ width: '100%', height: 220, borderRadius: 10, border: '1px solid #e2e8f0', display: 'block' }}
                    />
                    <div style={{ marginTop: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155' }}>
                      {storeAddress.split(',').slice(0, 4).join(',')}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!latitude) return alert('Please detect your location first.');
                    setAddressSaving(true); setAddressResult('idle');
                    const res = await saveStoreAddress(vendorName, storeAddress, locationLink, latitude, longitude);
                    setAddressSaving(false);
                    if (res.success) setAddressResult('success');
                    else setAddressResult('error:' + res.error);
                  }}
                  disabled={addressSaving || !vendorName || !latitude}
                  style={{
                    marginTop: 20, width: '100%', padding: '15px', borderRadius: 8, border: 'none',
                    background: !latitude ? '#e2e8f0' : addressSaving ? '#94a3b8' : '#0f172a',
                    color: !latitude ? '#94a3b8' : '#fff',
                    fontWeight: 800, fontSize: '15px',
                    cursor: (!latitude || addressSaving) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', boxShadow: latitude ? '0 2px 8px rgba(15,23,42,0.3)' : 'none'
                  } as React.CSSProperties}
                >
                  {addressSaving ? 'Saving...' : !latitude ? '📡 Detect location first' : '💾 Save Store Location'}
                </button>
                {addressResult === 'success' && <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>✅ Store location saved! Customers can now find you.</div>}
                {typeof addressResult === 'string' && addressResult.startsWith('error:') && <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, background: '#fff8f8', border: '1px solid #ffdcdc', color: '#e53e3e', fontSize: '13px' }}>⨯ {addressResult.slice(6)}</div>}
              </div>
            </div>

            {/* Business Hours */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginTop: 24 }}>
              <div style={{ background: '#0f172a', padding: '14px 24px', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                🕐 Business Hours
              </div>
              
              <div style={{ padding: '28px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                  Set your store's operating hours. Customers will see this on your store page.
                </p>
                
                <div className="stat-grid" style={{ gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={lbl} htmlFor="openingTime">Opening Time</label>
                    <input 
                      id="openingTime" 
                      name="openingTime" 
                      type="time" 
                      value={openingTime} 
                      onChange={(e) => setOpeningTime(e.target.value)}
                      style={inp} 
                    />
                  </div>
                  <div>
                    <label style={lbl} htmlFor="closingTime">Closing Time</label>
                    <input 
                      id="closingTime" 
                      name="closingTime" 
                      type="time" 
                      value={closingTime} 
                      onChange={(e) => setClosingTime(e.target.value)}
                      style={inp} 
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={async () => {
                    setIsSavingHours(true);
                    setHoursResult('idle');
                    const res = await saveBusinessHours(vendorName, openingTime, closingTime);
                    setIsSavingHours(false);
                    if (res.success) setHoursResult('success');
                    else setHoursResult('error:' + res.error);
                  }}
                  disabled={isSavingHours}
                  style={{ background: isSavingHours ? '#fbbf80' : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '15px', fontWeight: 800, fontSize: '15px', cursor: isSavingHours ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.3)' }}
                >
                  {isSavingHours ? 'Saving...' : '💾 Save Business Hours'}
                </button>

                {hoursResult === 'success' && <div style={{ marginTop: 16, padding: '14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>✓ Business hours saved!</div>}
                {typeof hoursResult === 'string' && hoursResult.startsWith('error:') && <div style={{ marginTop: 16, padding: '14px', borderRadius: 8, background: '#fff8f8', border: '1px solid #ffdcdc', color: '#e53e3e', fontSize: '14px' }}>⨯ {hoursResult.slice(6)}</div>}
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
        <Link href={`/onboarding`} className="mobile-nav-item">
          <span className="mobile-nav-icon">➕</span>
          <span>List Item</span>
        </Link>
        <Link href={`/profile`} className="mobile-nav-item active">
          <span className="mobile-nav-icon">🏪</span>
          <span>Profile</span>
        </Link>
      </nav>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
