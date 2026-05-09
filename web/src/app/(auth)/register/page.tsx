'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/authService';
import styles from '../login/page.module.css';

function RegisterForm() {
  const [authMode, setAuthMode] = useState<'details' | 'otp_verify'>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get('redirect') || '/';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (authMode === 'details') {
        // Step 1: Send OTP for passwordless signup
        await authService.signInWithOtp(email);
        setMessage({
          text: 'A 6-digit security code has been sent to your email.',
          success: true,
        });
        setAuthMode('otp_verify');
      } else {
        // Step 2: Verify the 6-digit code and provide their chosen password for Supabase account creation
        const user = await authService.verifyOtp(email, otpToken, password);
        
        // (Optional background) Update their display name
        if (user) {
          try {
            const { supabase } = await import('@/lib/supabase');
            await supabase.from('profiles').upsert({ id: user.id, full_name: fullName });
          } catch (e) {}
        }

        setMessage({ text: '✅ Verified successfully!', success: true });
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Verification failed. Please try again.', success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authSplit}>
        <div className={styles.formSide}>
          <div className={styles.authBox}>
            <div className={styles.authIcon}>✨</div>

            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>
              {redirectTo === '/checkout'
                ? '🔒 One quick step before checkout'
                : 'Join GUMA BASKET — free forever'}
            </p>

            {redirectTo === '/checkout' && (
              <div className={styles.checkoutBanner}>
                <strong>Almost there!</strong> Create your free account to complete your purchase and track your orders.
              </div>
            )}

            <form onSubmit={handleRegister} className={styles.form}>
              {authMode === 'details' && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="John Doe"
                    />
                  </div>

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
                  <div className={styles.inputGroup}>
                    <label htmlFor="password">Choose Password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="At least 6 characters"
                      minLength={6}
                    />
                  </div>
                </>
              )}

              {authMode === 'otp_verify' && (
                <div className={styles.inputGroup}>
                  <label htmlFor="otpToken">Enter 6-Digit Code</label>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                    Secure pin sent to {email}
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

              {message && (
                <p className={message.success ? styles.success : styles.error}>
                  {message.success ? '✅ ' : '⚠️ '} {message.text}
                </p>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'PROCESSING...' : authMode === 'details' ? 'SEND VERIFICATION PIN' : 'VERIFY & CREATE ACCOUNT'}
              </button>
            </form>

            <p className={styles.switchAuth}>
              Already have an account?{' '}
              <Link href={`/login${redirectTo !== '/' ? `?redirect=${redirectTo}` : ''}`}>
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className={styles.imageSide} style={{ backgroundImage: "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 100%), url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80')" }}>
          <div className={styles.imageContent}>
            <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Your Journey Begins Here.
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6, fontWeight: 500 }}>
              Discover an exclusive selection of natural ingredients, premium meats, and artisan bakery products crafted for those who value quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
