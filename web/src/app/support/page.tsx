'use client';

import { useState } from 'react';
import styles from './support.module.css';

const FAQS = [
  { q: 'How long does delivery take?', a: 'Most orders are delivered within 2–4 hours in supported areas. Same-day delivery is available for orders placed before 2 PM.' },
  { q: 'Can I return a product?', a: 'Yes! If you\'re not 100% happy with a fresh item, contact us within 24 hours and we\'ll replace it or issue a full refund — no questions asked.' },
  { q: 'How do I track my order?', a: 'After placing your order you\'ll receive an SMS and email with a live tracking link. You can also check your account dashboard.' },
  { q: 'Is my payment information safe?', a: 'Absolutely. All payments go through PayFast — a South African PCI-DSS compliant gateway. We never store card details.' },
  { q: 'How do I become a vendor?', a: 'Visit business.GUMA BASKET.co.za to sign up as a vendor. Approval takes 24 hours and you can start listing products immediately.' },
];

export default function SupportPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: send to backend/email service
    setSubmitted(true);
  };

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroIcon}>💬</div>
          <h1>How can we help?</h1>
          <p>We're here for you — any question, any time.</p>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* Left col: FAQ + Contact Cards */}
          <div>
            {/* Contact cards */}
            <div className={styles.contactCards}>
              <div className={styles.contactCard}>
                <div className={styles.cardIcon}>📞</div>
                <div>
                  <strong>Call Us</strong>
                  <p>Mon–Fri, 8am–6pm</p>
                  <a href="tel:+27800000000">+27 800 000 000</a>
                </div>
              </div>
              <div className={styles.contactCard}>
                <div className={styles.cardIcon}>💬</div>
                <div>
                  <strong>WhatsApp</strong>
                  <p>24/7 instant support</p>
                  <a href="https://wa.me/27800000000" target="_blank" rel="noopener noreferrer">Chat now</a>
                </div>
              </div>
              <div className={styles.contactCard}>
                <div className={styles.cardIcon}>📧</div>
                <div>
                  <strong>Email</strong>
                  <p>We reply within 2 hours</p>
                  <a href="mailto:support@GUMA BASKET.co.za">support@GUMA BASKET.co.za</a>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <div className={styles.faqList}>
              {FAQS.map((faq, i) => (
                <div key={i} className={`${styles.faqItem} ${open === i ? styles.faqOpen : ''}`}>
                  <button className={styles.faqQuestion} onClick={() => setOpen(open === i ? null : i)}>
                    <span>{faq.q}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {open === i && <div className={styles.faqAnswer}>{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Right col: Contact Form */}
          <div>
            <h2 className={styles.sectionTitle}>Send us a Message</h2>
            {submitted ? (
              <div className={styles.successBox}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3>Message Received!</h3>
                <p>Thank you for reaching out. One of our team members will get back to you within 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label>Your Name</label>
                    <input type="text" required placeholder="John Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Email Address</label>
                    <input type="email" required placeholder="john@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Subject</label>
                  <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                    <option value="">Choose a topic...</option>
                    <option>Order issue</option>
                    <option>Payment problem</option>
                    <option>Missing item</option>
                    <option>Damaged product</option>
                    <option>Become a vendor</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Message</label>
                  <textarea required rows={5} placeholder="Tell us what happened..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  SEND MESSAGE →
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
