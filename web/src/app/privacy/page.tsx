import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | GUMA BASKET',
  description: 'How GUMA BASKET collects, uses, and protects your personal information in compliance with the POPIA Act (South Africa).',
};

const SECTIONS = [
  {
    title: '1. Who We Are',
    body: 'GUMA BASKET (Pty) Ltd is a South African registered company operating a premium online fresh produce marketplace. We are committed to protecting your privacy in accordance with the Protection of Personal Information Act (POPIA), 2013.',
  },
  {
    title: '2. What Information We Collect',
    body: 'We collect: (a) Account information — your name, email address, and delivery address when you register; (b) Transaction data — order history and payment confirmation references (never raw card data); (c) Usage data — pages visited, products viewed, and device/browser information to improve performance; (d) Communication data — any messages you send to our support team.',
  },
  {
    title: '3. How We Use Your Information',
    body: 'Your information is used to: fulfil your orders and communicate delivery updates; personalize your shopping experience; send promotional emails (you may unsubscribe at any time); improve our platform through anonymised analytics; comply with legal obligations under South African law.',
  },
  {
    title: '4. How We Share Your Information',
    body: 'We do not sell your personal information. We may share limited data with: (a) Vendors — only your delivery address and first name needed to fulfil your order; (b) PayFast — for secure payment processing; (c) Delivery partners — for last-mile logistics. All third parties are bound by data processing agreements.',
  },
  {
    title: '5. Data Security',
    body: 'We use industry-standard encryption (TLS/HTTPS) for all data in transit. Our databases are hosted on Supabase with row-level security policies. Only authorised staff can access personal data, and all access is logged and audited.',
  },
  {
    title: '6. Your Rights Under POPIA',
    body: 'You have the right to: access the personal information we hold about you; request correction of inaccurate data; request deletion of your account and associated data; lodge a complaint with the Information Regulator of South Africa (inforeg.org.za).',
  },
  {
    title: '7. Cookies',
    body: 'We use strictly necessary cookies (for sessions and cart state) and optional analytics cookies. You can opt out of analytics cookies via your browser settings without impacting core functionality.',
  },
  {
    title: '8. Contact Our Information Officer',
    body: 'For any privacy concerns, requests for access, or deletion requests, contact our Information Officer at privacy@GUMA BASKET.co.za. We will respond within 30 days as required by POPIA.',
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: '#ffffff', color: '#0f172a', padding: '60px 20px 100px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Last updated: March 2026 · GUMA BASKET (Pty) Ltd · POPIA Compliant</p>
        </div>

        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ color: '#065f46', fontWeight: 600, fontSize: '0.9rem' }}>🔒 We take your privacy seriously. We comply with the South African Protection of Personal Information Act (POPIA) and will never sell your data.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: 10, letterSpacing: '-0.01em' }}>{s.title}</h2>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{s.body}</p>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 60, padding: 32, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Privacy concerns? Email our Information Officer at{' '}
            <a href="mailto:privacy@GUMA BASKET.co.za" style={{ color: '#111111', fontWeight: 700 }}>privacy@GUMA BASKET.co.za</a>
          </p>
        </div>
      </div>
    </main>
  );
}
