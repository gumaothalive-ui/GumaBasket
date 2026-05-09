'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/authService';
import styles from './page.module.css';

function LoginForm() {
  const [authMode, setAuthMode] = useState<'password' | 'otp_request' | 'otp_verify'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to redirect after login (defaults to home)
  const redirectTo = searchParams.get('redirect') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'password') {
        await authService.signIn(email, password);
        router.push(redirectTo);
        router.refresh();
      } else if (authMode === 'otp_request') {
        await authService.signInWithOtp(email);
        setSuccessMsg('A 6-digit code has been sent to your email.');
        setAuthMode('otp_verify');
      } else if (authMode === 'otp_verify') {
        await authService.verifyOtp(email, otpToken);
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authSplit}>
        <div className={styles.formSide}>
          <div className={styles.authBox}>
            {/* Icon */}
            <div className={styles.authIcon}>🛍️</div>

            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>
              {redirectTo === '/checkout'
                ? '🔒 Sign in to complete your purchase'
                : 'Sign in to your GUMA BASKET account'}
            </p>

            {/* Checkout reminder banner */}
            {redirectTo === '/checkout' && (
              <div className={styles.checkoutBanner}>
                <strong>Your cart is waiting!</strong> Sign in to complete your order securely.
              </div>
            )}

            <form onSubmit={handleLogin} className={styles.form}>
              {authMode !== 'otp_verify' && (
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                  />
                </div>
              )}

              {authMode === 'password' && (
                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              )}

              {authMode === 'otp_verify' && (
                <div className={styles.inputGroup}>
                  <label htmlFor="otpToken">Enter 6-Digit Code</label>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                    Sent to {email}
                  </p>
                  <input
                    id="otpToken"
                    type="text"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    required
                    placeholder="123456"
                    maxLength={6}
                    style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 800 }}
                  />
                </div>
              )}

              {error && <p className={styles.error}>⚠️ {error}</p>}
              {successMsg && <p className={styles.success}>✅ {successMsg}</p>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'PROCESSING...' : authMode === 'password' ? 'SIGN IN' : authMode === 'otp_request' ? 'SEND LOGIN CODE' : 'VERIFY & LOGIN'}
              </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              {authMode === 'password' ? (
                <button type="button" onClick={() => { setAuthMode('otp_request'); setError(null); }} style={{ background: 'none', border: 'none', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', padding: '8px 16px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'none'}>
                  Get a Magic Link Code ✨
                </button>
              ) : (
                <button type="button" onClick={() => { setAuthMode('password'); setError(null); }} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>
                  Use Password Instead
                </button>
              )}
            </div>

            <p className={styles.switchAuth}>
              Don&apos;t have an account?{' '}
              <Link href={`/register${redirectTo !== '/' ? `?redirect=${redirectTo}` : ''}`}>
                Create one free
              </Link>
            </p>
          </div>
        </div>

        <div className={styles.imageSide}>
          <div className={styles.imageContent}>
            <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Premium Quality & Freshness.
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6, fontWeight: 500 }}>
              Join the GUMA BASKET community for exclusive access to hand-picked seasonal produce, artisanal goods, and elite delivery services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
