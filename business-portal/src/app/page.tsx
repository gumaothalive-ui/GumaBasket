import Link from 'next/link';
import { getSession } from './login/actions';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getSession();
  if (session.success && session.vendorName) {
     redirect('/products');
  }

  return (
    <main style={{ background: '#fff', minHeight: '100vh', fontFamily: 'inherit', overflowX: 'hidden' }}>
      {/* Top bar */}
      <div style={{ background: '#0f172a', padding: '10px 0', textAlign: 'center', fontSize: '12px', color: '#fff', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        🚀 Start selling in under 5 minutes — No credit card required
      </div>

      {/* Nav */}
      <nav className="px-mobile-16" style={{ 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #f1f5f9', 
        padding: '0 40px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        height: 72,
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Guma Basket" style={{ height: '40px', width: 'auto' }} />
          <div style={{ height: 24, width: 1, background: '#e2e8f0' }} className="hide-mobile" />
          <span className="hide-mobile" style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', letterSpacing: '-0.5px' }}>SELLER CENTER</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '10px 16px', borderRadius: 10 }}>Log In</Link>
          <Link href="/signup" className="hide-mobile" style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: 10, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }}>
            Join as Seller →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-mobile-16" style={{ 
        background: 'radial-gradient(circle at top right, #f8fafc, #ffffff)', 
        padding: '80px 40px', 
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 100, padding: '8px 16px', marginBottom: 32, fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            🇿🇦 South Africa's #1 Elite Food Marketplace
          </div>
          <h1 className="text-mobile-40" style={{ fontSize: 'clamp(44px, 7vw, 84px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-4px', marginBottom: 24, color: '#0f172a' }}>
            Sell Smarter.<br />
            <span style={{ 
              background: 'linear-gradient(to right, #0f172a, #334155)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Earn Faster.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#64748b', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 48px', fontWeight: 500 }}>
            The ultimate platform for premium food vendors. List products, track sales, and get paid instantly.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <Link href="/signup" style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '18px 48px', borderRadius: 12, fontSize: '17px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)' }}>
              Get Started Free →
            </Link>
            <Link href="/login" style={{ background: '#fff', color: '#0f172a', textDecoration: 'none', fontWeight: 700, padding: '18px 40px', borderRadius: 12, fontSize: '17px', border: '2px solid #e2e8f0' }}>
              Sign In
            </Link>
          </div>

          {/* App Mockup Visual */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '120%', height: '120%', 
              background: 'radial-gradient(circle, rgba(15, 23, 42, 0.05) 0%, transparent 70%)',
              zIndex: 0
            }} />
            <img 
              src="/mobile-mockup.png" 
              alt="Guma Seller App Mockup" 
              style={{ 
                width: '100%', 
                height: 'auto', 
                borderRadius: '24px', 
                boxShadow: '0 30px 60px -12px rgba(15, 23, 42, 0.25)',
                position: 'relative',
                zIndex: 1
              }} 
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-mobile-16" style={{ background: '#0f172a', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
          {[
            { label: 'Platform Fee', val: '15%', desc: 'Straightforward auto-markup model' },
            { label: 'Setup Time', val: '< 5 min', desc: 'Go live faster than any other platform' },
            { label: 'Payout Frequency', val: 'Bi-Weekly', desc: 'Automated EFT straight to your SA bank' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{s.label}</div>
              <div style={{ fontSize: '48px', fontWeight: 900, color: '#ffffff', letterSpacing: '-2px', marginBottom: 8 }}>{s.val}</div>
              <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps Section */}
      <section className="px-mobile-16" style={{ padding: '120px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-2px', color: '#0f172a', marginBottom: 20 }}>Simple. Powerful. Elite.</h2>
            <p style={{ color: '#64748b', fontSize: '18px', maxWidth: 600, margin: '0 auto' }}>Everything you need to grow your food business in the digital age.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            {[
              { title: 'Smart Onboarding', desc: 'AI-assisted product listing and category mapping for speed.', icon: '✨' },
              { title: 'Real-time Analytics', desc: 'Track your earnings and order volume with professional charts.', icon: '📈' },
              { title: 'Driver Dispatch', desc: 'Automated logistics handling. You cook, we deliver.', icon: '🚛' },
            ].map((f, i) => (
              <div key={i} style={{ 
                padding: '40px', 
                borderRadius: 24, 
                border: '1px solid #f1f5f9', 
                background: '#f8fafc',
                transition: 'transform 0.3s ease'
              }}>
                <div style={{ fontSize: '40px', marginBottom: 24 }}>{f.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>{f.title}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '15px' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-mobile-16" style={{ 
        background: '#0f172a', 
        padding: '120px 40px', 
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: '#fff', letterSpacing: '-3px', marginBottom: 32 }}>Ready to join the elite?</h2>
        <Link href="/signup" style={{ 
          display: 'inline-block', 
          background: '#fff', 
          color: '#0f172a', 
          textDecoration: 'none', 
          fontWeight: 900, 
          padding: '20px 64px', 
          borderRadius: 12, 
          fontSize: '18px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          Apply as Vendor →
        </Link>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 40, fontSize: '14px' }}>
          Join 500+ premium vendors across South Africa.
        </p>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: '#475569', fontSize: '13px', padding: '40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        © 2024 GUMA BASKET · Elite Seller Network
      </footer>
    </main>
  );
}
