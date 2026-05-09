'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import styles from './checkout.module.css';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('@/components/checkout/LocationPickerMap'), { ssr: false });

type Step = 'shipping' | 'payment' | 'success';

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('shipping');
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [shipping, setShipping] = useState({
    firstName: '', lastName: '', address: '', postalCode: '', phone: '', notes: '', lat: -33.98438, lng: 25.65936
  });
  
  // Tiered Delivery Pricing
  const shippingFee = subtotal >= 500 || subtotal === 0 
    ? 0 
    : subtotal < 100 
      ? 15.00 
      : subtotal < 250 
        ? 25.00 
        : 35.00;
  const grandTotal = subtotal + shippingFee;

  const [realOrderId, setRealOrderId] = useState<string>('');
  const [realOrderRef, setRealOrderRef] = useState<string>('');
  
  // Stripe / Promo Code Additions
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoStatus, setPromoStatus] = useState('');
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handleApplyPromo = async () => {
    if (promoCode.toUpperCase() === 'WELCOME10') {
      setDiscount(subtotal * 0.1);
      setPromoStatus('✅ 10% applied!');
    } else {
      setDiscount(0);
      setPromoStatus('❌ Invalid promo code');
    }
  };

  const finalCartTotal = grandTotal - discount;

  // 🔒 Auth Guard — redirect to login if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/checkout');
    }
  }, [user, authLoading, router]);

  // If the user cancelled PayFast payment, they return to /checkout?cancelled=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('cancelled') === 'true') {
        setPaymentError('Payment was cancelled. You can try again.');
        setStep('payment');
      }
    }
  }, []);

  // Show nothing while auth is loading (prevents flash)
  if (authLoading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
        <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Checking your session...</p>
      </div>
    );
  }

  // Not logged in — show prompt while redirect happens
  if (!user) {
    return (
      <div className="container" style={{ padding: '120px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ marginBottom: '1rem' }}>Sign In Required</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You need an account to complete your purchase. <br />Your cart will be saved.
        </p>
        <Link href="/login?redirect=/checkout" style={{ background: '#111111', color: 'white', padding: '1rem 2.5rem', fontWeight: 900, borderRadius: '6px', fontSize: '1rem' }}>
          SIGN IN TO CHECKOUT
        </Link>
        <br /><br />
        <Link href="/register?redirect=/checkout" style={{ color: '#111', fontWeight: 700, fontSize: '0.9rem' }}>
          Don&apos;t have an account? Create one free →
        </Link>
      </div>
    );
  }


  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentError(null);

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, subtotal: finalCartTotal, shipping, user }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create order. Please try again.');

      // ⚠️ Do NOT clear cart yet — user hasn't paid.
      // Cart is cleared on /checkout/success after PayFast confirms payment.

      if (data.isLocalBypass) {
        window.location.href = data.bypassUrl;
        return;
      }

      // Redirect to PayFast via hidden form submission
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.payfastUrl;
      for (const key in data.payfastArgs) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data.payfastArgs[key];
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      setPaymentError(err.message || 'Could not process payment. Please try again.');
      setLoading(false);
    }
  };



  if (cart.length === 0 && step !== 'success') {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h1>YOUR CART IS EMPTY</h1>
        <Link href="/shop" style={{ marginTop: '2rem', display: 'inline-block', background: 'black', color: 'white', padding: '1rem 2rem', fontWeight: 900 }}>RETURN TO SHOP</Link>
      </div>
    );
  }

  if (step === 'success') {
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
    return (
      <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Hero confirmation banner */}
        <div style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          padding: '60px 24px 80px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Animated check badge */}
          <div className={styles.successIcon} style={{ background: '#10b981', boxShadow: '0 0 0 12px rgba(16,185,129,0.15)', marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Order Confirmed</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Thank you, {firstName}!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500 }}>
            Reference: <span style={{ color: '#fff', fontWeight: 800, fontFamily: 'monospace' }}>{realOrderRef}</span>
          </p>
        </div>

        {/* Card that floats up over banner */}
        <div style={{ flex: 1, padding: '0 16px 40px', marginTop: -32 }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '28px 24px', marginBottom: 16 }}>
            <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.8, textAlign: 'center', marginBottom: 24 }}>
              Your order is being prepared and will be delivered to your address. You&apos;ll receive an <strong style={{ color: '#111' }}>SMS and email confirmation</strong> shortly.
            </p>

            {/* Progress Steps */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 8 }}>
              {[
                { icon: '📦', title: 'Packing', active: true },
                { icon: '🚚', title: 'On the Way', active: false },
                { icon: '🏠', title: 'Delivered', active: false },
              ].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px',
                      background: step.active ? '#0f172a' : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px',
                      boxShadow: step.active ? '0 4px 14px rgba(15,23,42,0.25)' : 'none'
                    }}>
                      {step.icon}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: step.active ? '#0f172a' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.title}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ height: 2, flex: 0.5, background: '#e2e8f0', marginBottom: 24, flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href={`/track?orderId=${realOrderId}`} style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #111 100%)',
              color: 'white', padding: '18px', fontWeight: 900, borderRadius: 14,
              fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.04em',
              textDecoration: 'none', textAlign: 'center', display: 'block',
              boxShadow: '0 4px 20px rgba(15,23,42,0.3)'
            }}>
              📍 Track My Order
            </Link>
            <Link href="/" style={{
              background: '#f8fafc', color: '#0f172a', padding: '16px', fontWeight: 800,
              borderRadius: 14, fontSize: '14px', textDecoration: 'none',
              textAlign: 'center', display: 'block', border: '1.5px solid #e2e8f0'
            }}>
              🛍️ Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 20px' }}>
      <div className={styles.checkoutLayout}>
        <div className={styles.mainContent}>
          <div className={styles.stepper}>
            <div className={`${styles.step} ${step === 'shipping' ? styles.active : styles.done}`}>1. SHIPPING</div>
            <div className={`${styles.step} ${step === 'payment' ? styles.active : ''}`}>2. PAYMENT</div>
          </div>

          {step === 'shipping' ? (
            <form className={styles.form} onSubmit={handleShippingSubmit}>
              <h2>SHIPPING ADDRESS</h2>
              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label>First Name</label>
                  <input type="text" required placeholder="John" value={shipping.firstName} onChange={e => setShipping(s => ({ ...s, firstName: e.target.value }))} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Last Name</label>
                  <input type="text" required placeholder="Doe" value={shipping.lastName} onChange={e => setShipping(s => ({ ...s, lastName: e.target.value }))} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>GPS Location & Map Pin</label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Allow location access or drag the map to pinpoint your exact delivery spot.</p>
                <LocationPickerMap onLocationChange={(lat, lng) => setShipping(s => ({ ...s, lat, lng }))} />
              </div>
              <div className={styles.inputGroup}>
                <label>Street Address</label>
                <input type="text" required spellCheck={true} autoCorrect="on" placeholder="123 Govan Mbeki Ave, Nelson Mandela Bay" value={shipping.address} onChange={e => setShipping(s => ({ ...s, address: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label>Postal Code</label>
                  <input type="text" required placeholder="8001" value={shipping.postalCode} onChange={e => setShipping(s => ({ ...s, postalCode: e.target.value }))} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Phone Number</label>
                  <input type="tel" required placeholder="+27 82 123 4567" value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Delivery Notes (Optional)</label>
                <input type="text" spellCheck={true} autoCorrect="on" placeholder="Ring bell, leave at door, etc." value={shipping.notes} onChange={e => setShipping(s => ({ ...s, notes: e.target.value }))} />
              </div>
              <button type="submit" className={styles.primaryBtn}>CONTINUE TO PAYMENT →</button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handlePaymentSubmit}>
              <h2>SECURE PAYMENT</h2>

              <div className={styles.secureGatewayBox}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <div>
                  <strong>256-bit SSL Encrypted Checkout</strong>
                  <p>You will be securely redirected to PayFast to complete your payment. We never store your card details.</p>
                </div>
              </div>

              {/* PayFast redirect panel */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '28px 24px', marginTop: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, color: '#0f172a', textTransform: 'none', letterSpacing: 0 }}>
                  Pay securely with PayFast
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20 }}>
                  You&apos;ll be redirected to PayFast where you can pay by <strong>Card, EFT, or SnapScan</strong>. Your cart is saved and will only be cleared after successful payment.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {['Visa', 'Mastercard', 'EFT', 'SnapScan', 'Instant EFT'].map(m => (
                    <span key={m} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{m}</span>
                  ))}
                </div>
              </div>

              <div className={styles.trustRow}>
                <span>🔒 256-bit SSL</span>
                <span>✅ PCI DSS Compliant</span>
                <span>🛡️ Fraud Protection</span>
              </div>

              {paymentError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  ⚠️ {paymentError}
                </div>
              )}

              <button type="submit" className={styles.primaryBtn} disabled={loading}>
                {loading ? (
                  <span className={styles.loadingSpinner}>⟳ REDIRECTING TO PAYFAST...</span>
                ) : (
                  `🔒 PAY WITH PAYFAST — R ${finalCartTotal.toFixed(2)}`
                )}
              </button>
              <button type="button" className={styles.backBtn} onClick={() => setStep('shipping')}>← BACK TO SHIPPING</button>
            </form>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.orderSummary}>
            <h3>ORDER SUMMARY</h3>
            <div className={styles.itemsSummary}>
              {cart.map(item => (
                <div key={item.id} className={styles.summaryItem}>
                  <img src={item.imageUrl} alt={item.title} />
                  <div className={styles.summaryInfo}>
                    <p className={styles.summaryTitle}>{item.title}</p>
                    <p className={styles.summaryQty}>Qty: {item.quantity}</p>
                  </div>
                  <div className={styles.summaryPrice}>R {(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>R {subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Shipping</span>
                {shippingFee === 0 ? (
                  <span className={styles.free}>FREE (Over R500)</span>
                ) : (
                  <span>R {shippingFee.toFixed(2)}</span>
                )}
              </div>
              
              <div style={{ padding: '16px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', margin: '16px 0', display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="Enter promo code" 
                  value={promoCode} 
                  onChange={e => setPromoCode(e.target.value)} 
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8 }} 
                />
                <button type="button" onClick={handleApplyPromo} style={{ background: '#0f172a', color: 'white', padding: '0 16px', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Apply</button>
              </div>
              {promoStatus && <div style={{ fontSize: '0.85rem', fontWeight: 600, color: promoStatus.includes('✅') ? '#05a357' : '#ef4444', marginBottom: 12 }}>{promoStatus}</div>}

              {discount > 0 && (
                <div className={styles.totalRow} style={{ color: '#05a357', fontWeight: 700 }}>
                  <span>Discount</span>
                  <span>- R {discount.toFixed(2)}</span>
                </div>
              )}

              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Total</span>
                <span>R {finalCartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
