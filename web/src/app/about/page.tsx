import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Story | GUMA BASKET',
  description: 'Learn about GUMA BASKET — South Africa\'s premium fresh produce marketplace connecting local farmers and artisans with discerning shoppers.',
};

export default function AboutPage() {
  return (
    <main style={{ background: '#ffffff', color: '#0f172a' }}>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(249,115,22,0.15)', color: '#fb923c', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: '30px', marginBottom: '24px', border: '1px solid rgba(0,0,0,0.3)' }}>Est. 2024 · South Africa</div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '24px' }}>We Believe Everyone Deserves Premium.</h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>GUMA BASKET was born from a simple idea: make the highest-quality fresh produce and artisan goods accessible to every South African household.</p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '100px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48 }}>
          {[
            { icon: '🌿', title: 'Farm-to-Door Freshness', desc: 'We partner directly with local farms, eliminating middlemen so you get produce at its peak freshness — often harvested within 24 hours of delivery.' },
            { icon: '🤝', title: 'Empowering Local Vendors', desc: 'Every product on GUMA BASKET comes from a verified South African vendor. We provide the technology; they provide the craft.' },
            { icon: '🔒', title: 'Trust at Every Step', desc: 'From PayFast-secured payments to our 100% freshness guarantee, we\'ve built every system around your peace of mind.' },
          ].map(item => (
            <div key={item.title} style={{ padding: 40, border: '1.5px solid #f1f5f9', borderRadius: 20, background: '#fafafa', transition: 'box-shadow 0.2s' }}>
              <div style={{ fontSize: 48, marginBottom: 24 }}>{item.icon}</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 12, color: '#0f172a', letterSpacing: '-0.02em' }}>{item.title}</h2>
              <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.95rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#fff7ed', borderTop: '1px solid #fed7aa', borderBottom: '1px solid #fed7aa', padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#9a3412', marginBottom: 16, letterSpacing: '-0.03em' }}>Ready to taste the difference?</h2>
        <p style={{ color: '#c2410c', marginBottom: 32, fontSize: '1.05rem' }}>Join thousands of South Africans who shop smarter with GUMA BASKET.</p>
        <Link href="/" style={{ background: '#111111', color: '#fff', padding: '14px 36px', borderRadius: 12, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', display: 'inline-block', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>Shop Now →</Link>
      </section>
    </main>
  );
}
