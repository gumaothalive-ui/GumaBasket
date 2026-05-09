'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'details' | 'otp';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [message, setMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form data held in state so OTP step can reuse it
  const [formData, setFormData] = useState({ businessName: '', email: '', password: '' });

  // OTP digits (6 boxes)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const inp: React.CSSProperties = { width: '100%', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', color: '#0f172a', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.02em' };
  const btn: React.CSSProperties = { width: '100%', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 };

  // ─── Step 1: Submit details & request OTP ──────────────────────────────────
  async function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const fd = new FormData(e.currentTarget);
    const data = {
      businessName: (fd.get('businessName') as string).trim(),
      email: (fd.get('email') as string).trim().toLowerCase(),
      password: fd.get('password') as string,
    };

    if (data.password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    });
    const result = await res.json();

    setIsSubmitting(false);

    if (!result.success) {
      setMessage(result.error || 'Failed to send verification code.');
      return;
    }

    setFormData(data);
    setSuccessMsg(`A 6-digit code was sent to ${data.email}`);
    setStep('otp');
  }

  // ─── OTP digit input handler ───────────────────────────────────────────────
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  // ─── Step 2: Verify OTP & create account ──────────────────────────────────
  async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setMessage('Please enter all 6 digits.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, otp: code, password: formData.password, businessName: formData.businessName }),
    });
    const result = await res.json();

    setIsSubmitting(false);

    if (!result.success) {
      setMessage(result.error || 'Verification failed.');
      return;
    }

    router.push(`/products`);
  }

  // ─── Resend OTP ─────────────────────────────────────────────────────────────
  async function handleResend() {
    setIsSendingOtp(true);
    setMessage('');
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email }),
    });
    const result = await res.json();
    setIsSendingOtp(false);
    if (result.success) {
      setSuccessMsg('A new code has been sent to your email.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      setMessage(result.error || 'Failed to resend code.');
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 40px', display: 'flex', alignItems: 'center', height: 72, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '56px', width: 'auto' }} />
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '60px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, alignItems: 'center' }}>
        {/* Left Side */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'inline-flex', padding: '6px 14px', background: '#f1f5f9', borderRadius: 30, fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: 24, border: '1px solid #e2e8f0' }}>
            🚀 3 MONTHS FREE — NO CREDIT CARD
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24, color: '#0f172a' }}>
            Grow your store with <span style={{ color: '#0f172a', textDecoration: 'underline' }}>GUMA BASKET</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '18px', lineHeight: 1.6, marginBottom: 40, maxWidth: 480 }}>
            Join South Africa&apos;s most elite vendor network. We handle the logistics, you focus on your craft.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              { icon: '💎', title: 'Elite Visibility', desc: 'Reach thousands of premium customers daily.' },
              { icon: '🚚', title: 'Logistics Handled', desc: 'We pick, pack, and deliver to the customer.' },
              { icon: '💳', title: 'Fast Payouts', desc: 'Bi-weekly EFT payments directly to your bank.' },
              { icon: '📈', title: 'Live Insights', desc: 'Real-time dashboard to track your performance.' },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: '24px', marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="premium-card" style={{ padding: '48px 40px' }}>
          {step === 'details' ? (
            <>
              <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: 8, color: '#0f172a' }}>Create your storefront</h2>
              <p style={{ color: '#64748b', fontSize: '15px', marginBottom: 32 }}>Free for 3 months. No credit card required.</p>

              <form onSubmit={handleDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={lbl} htmlFor="businessName">Store / Business Name</label>
                  <input id="businessName" name="businessName" type="text" required style={inp} placeholder="e.g. Unity Cash & Carry" />
                </div>
                <div>
                  <label style={lbl} htmlFor="email">Work Email</label>
                  <input id="email" name="email" type="email" required autoComplete="email" style={inp} placeholder="you@business.com" />
                </div>
                <div>
                  <label style={lbl} htmlFor="password">Create Password</label>
                  <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" style={inp} placeholder="Min. 6 characters" />
                </div>

                <div style={{ display: 'flex', gap: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px', alignItems: 'flex-start' }}>
                  <input type="checkbox" id="terms" name="terms" required style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                  <label htmlFor="terms" style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, cursor: 'pointer' }}>
                    I agree to the <Link href="/terms" style={{ color: '#0f172a', textDecoration: 'underline', fontWeight: 700 }} target="_blank">Merchant Agreement</Link>. After trial, a monthly fee of R120 applies.
                  </label>
                </div>

                <button type="submit" disabled={isSubmitting} style={{ ...btn, marginTop: 10, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Sending verification code...' : 'Continue — Verify Email →'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* OTP Step */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>📧</div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>Check your email</h2>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
                  We sent a 6-digit verification code to<br />
                  <strong style={{ color: '#0f172a' }}>{formData.email}</strong>
                </p>
              </div>

              {successMsg && (
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
                  ✅ {successMsg}
                </div>
              )}

              <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* 6-box OTP input */}
                <div>
                  <label style={{ ...lbl, textAlign: 'center', marginBottom: 16 }}>Enter Verification Code</label>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        style={{
                          width: 52, height: 60, textAlign: 'center', fontSize: '24px', fontWeight: 900,
                          border: `2px solid ${digit ? '#0f172a' : '#e2e8f0'}`,
                          borderRadius: 12, outline: 'none', fontFamily: 'inherit', background: '#fff',
                          color: '#0f172a', transition: 'border-color 0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} style={{ ...btn, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Verifying...' : 'Verify & Create Account →'}
                </button>
              </form>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button onClick={handleResend} disabled={isSendingOtp} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isSendingOtp ? 'Resending...' : "Didn't receive a code? Resend"}
                </button>
              </div>

              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button onClick={() => { setStep('details'); setMessage(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  ← Change email / details
                </button>
              </div>
            </>
          )}

          {message && (
            <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '14px', fontWeight: 500 }}>
              ⚠️ {message}
            </div>
          )}

          <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px dotted #e2e8f0' }}>
            Already a vendor? <Link href="/login" style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
