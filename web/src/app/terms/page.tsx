import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | GUMA BASKET',
  description: 'Read the GUMA BASKET Terms and Conditions governing use of our platform, purchasing products, and engaging with our vendor marketplace.',
};

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the GUMA BASKET platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service. GUMA BASKET reserves the right to update these terms at any time; continued use constitutes acceptance of any changes.',
  },
  {
    title: '2. User Accounts',
    body: 'You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. GUMA BASKET will never ask for your password via email or phone.',
  },
  {
    title: '3. Products & Pricing',
    body: 'All prices are displayed in South African Rand (ZAR) and include VAT where applicable. GUMA BASKET acts as a marketplace connecting buyers with independent vendors. Each vendor is responsible for the accuracy of their product listings, including descriptions, weight, and imagery.',
  },
  {
    title: '4. Payments',
    body: 'Payments are processed securely via PayFast, a PCI DSS-compliant South African payment gateway. GUMA BASKET does not store your card information. All transactions are subject to PayFast\'s own terms of service.',
  },
  {
    title: '5. Delivery',
    body: 'Delivery times and fees vary by location and vendor. We aim for same-day delivery on orders placed before 2 PM, subject to availability. GUMA BASKET is not liable for delays caused by circumstances beyond our reasonable control.',
  },
  {
    title: '6. Returns & Refunds',
    body: 'If you\'re not satisfied with your order\'s freshness or quality, contact us within 24 hours of delivery. We will arrange a full refund or replacement at our discretion. Perishable goods may not be returned unless faulty.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'To the fullest extent permitted by South African law, GUMA BASKET shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability to you shall not exceed the value of your most recent order.',
  },
  {
    title: '8. Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes shall be subject to the exclusive jurisdiction of the courts of the Western Cape.',
  },
];

export default function TermsPage() {
  return (
    <main style={{ background: '#ffffff', color: '#0f172a', padding: '60px 20px 100px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12 }}>Terms & Conditions</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Last updated: March 2026 · GUMA BASKET (Pty) Ltd · Cape Town, South Africa</p>
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
            Questions about our terms? Contact us at{' '}
            <a href="mailto:legal@GUMA BASKET.co.za" style={{ color: '#111111', fontWeight: 700 }}>legal@GUMA BASKET.co.za</a>
          </p>
        </div>
      </div>
    </main>
  );
}
