import Link from 'next/link';
import { getSession } from './login/actions';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getSession();
  if (session.success && session.vendorName) {
     redirect('/products');
  }

  return (
    <main style={{ background: '#fff', minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* Top bar */}
      <div style={{ background: '#0f172a', padding: '8px 0', textAlign: 'center', fontSize: '13px', color: '#fff', fontWeight: 600, letterSpacing: '0.02em' }}>
        🎉 Free for 3 months — No credit card required
      </div>

      {/* Nav */}
      <nav className="px-mobile-16" style={{ background: '#fff', borderBottom: '2px solid #0f172a', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '48px', width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#555', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '8px 16px', borderRadius: 6, border: '1.5px solid #e8e8e8' }}>Log In</Link>
          <Link href="/signup" className="hide-mobile" style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '10px 22px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
            Start Selling Free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-mobile-16 py-mobile-40" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #fff 60%)', padding: '80px 40px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: 100, padding: '6px 14px', marginBottom: 28, fontSize: '12px', fontWeight: 700, color: '#334155' }}>
          🇿🇦 South Africa's #1 Elite Food Marketplace
        </div>
        <h1 className="text-mobile-40" style={{ fontSize: 'clamp(40px, 8vw, 76px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: 20, color: '#1a1a1a' }}>
          Sell smarter.<br />
          <span style={{ color: '#0f172a' }}>Earn more.</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#777', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 40px' }}>
          List your products once. Reach thousands of premium buyers instantly. You set the price — we handle the rest.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '16px 40px', borderRadius: 8, fontSize: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
            Create Seller Account →
          </Link>
          <Link href="/login" style={{ background: '#fff', color: '#1a1a1a', textDecoration: 'none', fontWeight: 700, padding: '16px 32px', borderRadius: 8, fontSize: '16px', border: '1.5px solid #e8e8e8' }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="px-mobile-16 py-mobile-40" style={{ background: '#1a1a1a', padding: '0 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {[
            { icon: '💰', val: '15%', label: 'Auto-Markup On Sales' },
            { icon: '📦', val: '< 1 min', label: 'To List a Product' },
            { icon: '🏦', val: 'Bi-weekly', label: 'EFT Payout Schedule' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '36px 24px', textAlign: 'center', borderRight: 'none', borderBottom: '1px solid #2a2a2a' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px' }}>{s.val}</div>
              <div style={{ color: '#777', fontSize: '13px', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-mobile-16 py-mobile-40" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12, textAlign: 'center', color: '#1a1a1a' }}>How It Works</h2>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: '15px', marginBottom: 56 }}>Three steps to start earning</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {[
            { step: '1', icon: '📝', title: 'Create Account', desc: 'Sign up with your business name, email and password. Free for 3 months.' },
            { step: '2', icon: '📦', title: 'List Your Products', desc: 'Add your products with name, price, category and description. Done in under a minute.' },
            { step: '3', icon: '💸', title: 'Start Earning', desc: 'Customers buy at your premium price. We pay you bi-weekly via EFT to your SA bank.' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 16, padding: '36px 28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, fontSize: '12px', fontWeight: 800, color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '4px 10px' }}>
                STEP {f.step}
              </div>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: 10, letterSpacing: '-0.3px', color: '#1a1a1a' }}>{f.title}</h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-mobile-16 py-mobile-40" style={{ background: '#0f172a', padding: '72px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', marginBottom: 12 }}>Ready to start selling?</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 36, fontSize: '16px' }}>Your first 3 months are completely free.</p>
        <Link href="/signup" style={{ display: 'inline-block', background: '#fff', color: '#0f172a', textDecoration: 'none', fontWeight: 900, padding: '16px 44px', borderRadius: 8, fontSize: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          Create Seller Account →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1a1a1a', color: '#777', fontSize: '13px', padding: '24px 40px', textAlign: 'center' }}>
        © 2024 GUMA BASKET Seller Center. All rights reserved.
      </footer>
    </main>
  );
}
