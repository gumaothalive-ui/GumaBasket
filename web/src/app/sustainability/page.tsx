import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sustainability | GUMA BASKET',
  description: 'Our commitment to sustainable farming, eco-friendly packaging, and zero food waste across GUMA BASKET\'s supply chain.',
};

const PILLARS = [
  { icon: '♻️', stat: '100%', label: 'Recyclable Packaging', desc: 'All our delivery packaging is either compostable or recyclable. We\'ve eliminated single-use plastic from the supply chain.' },
  { icon: '🌱', stat: '0 km', label: 'Food Miles Target', desc: 'We partner exclusively with farms within a 200 km radius of major metros, slashing transport emissions by up to 70%.' },
  { icon: '🚯', stat: '<2%', label: 'Food Waste Rate', desc: 'Our demand-driven model means we order only what\'s sold. Our food waste rate is 10× lower than traditional supermarkets.' },
  { icon: '⚡', stat: '2026', label: 'Carbon Neutral Goal', desc: 'We\'re on track to become fully carbon neutral by 2026, with verified offsets for every kilometre our drivers travel.' },
];

export default function SustainabilityPage() {
  return (
    <main style={{ background: '#ffffff', color: '#0f172a' }}>
      <section style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', color: '#fff', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: '30px', marginBottom: '24px', border: '1px solid rgba(74,222,128,0.3)' }}>🌍 Planet-First Commerce</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>Good for You. Good for the Planet.</h1>
          <p style={{ fontSize: '1.1rem', color: '#86efac', lineHeight: 1.7 }}>Sustainability isn't a buzzword at GUMA BASKET — it's baked into every decision we make, from supplier selection to your doorstep.</p>
        </div>
      </section>

      <section style={{ padding: '80px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {PILLARS.map(p => (
            <div key={p.label} style={{ textAlign: 'center', padding: 40, border: '1.5px solid #dcfce7', borderRadius: 20, background: '#f0fdf4' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{p.icon}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#16a34a', letterSpacing: '-0.04em', marginBottom: 4 }}>{p.stat}</div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.label}</h2>
              <p style={{ color: '#4b7a5a', fontSize: '0.9rem', lineHeight: 1.7 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '60px 20px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>Our Promise to You</h2>
        <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '1.05rem' }}>
          We believe sustainable commerce and affordability can coexist. That's why we absorb the cost of eco-friendly packaging, choosing not to pass it on to customers. When you shop with GUMA BASKET, you're voting for a better South Africa — one fresher delivery at a time.
        </p>
      </section>
    </main>
  );
}
