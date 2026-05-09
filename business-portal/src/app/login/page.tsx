'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginWithPassword } from './actions';

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const inp: React.CSSProperties = { width: '100%', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', color: '#0f172a', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.02em' };
  const btn: React.CSSProperties = { width: '100%', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    const result = await loginWithPassword(new FormData(e.currentTarget));
    setIsSubmitting(false);
    if (result.success) {
      router.push(`/products`);
    } else {
      setMessage(result.error || 'Login failed.');
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 40px', display: 'flex', alignItems: 'center', height: 72, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '56px', width: 'auto' }} />
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="premium-card" style={{ width: '100%', maxWidth: 440, padding: '48px 40px' }}>
          <div style={{ display: 'inline-flex', padding: '6px 14px', background: '#f1f5f9', borderRadius: 30, fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
            WELCOME BACK
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 8, color: '#0f172a' }}>Merchant Sign In</h1>
          <p style={{ color: '#64748b', fontSize: '15px', marginBottom: 32 }}>Login to manage your GUMA BASKET storefront.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={lbl} htmlFor="email">Work Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" style={inp} placeholder="you@business.com" />
            </div>
            <div>
              <label style={lbl} htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" style={inp} placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={isSubmitting} style={{ ...btn, opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Signing In...' : 'Sign In to Storefront →'}
            </button>
          </form>

          {message && <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '14px', fontWeight: 500 }}>⚠️ {message}</div>}

          <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px dotted #e2e8f0' }}>
            New to GUMA BASKET? <Link href="/signup" style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}>Create an Account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
