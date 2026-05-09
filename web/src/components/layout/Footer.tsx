import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        
        {/* Elite Monochrome Trust Bar */}
        <div className={styles.trustBar}>
          <div className={styles.trustGrid}>
            {[
              { title: 'SAME-DAY', desc: 'FAST DELIVERY' },
              { title: 'SECURE', desc: 'ENCRYPTED PAYMENTS' },
              { title: 'RETURNS', desc: 'EASY POLICY' },
              { title: 'SUPPORT', desc: '24/7 ASSISTANCE' },
            ].map((item) => (
              <div key={item.title} className={styles.trustItem}>
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.column}>
            <div className={styles.logo}>GUMA BASKET</div>
            <p className={styles.tagline}>Premium marketplace logistics for the South African economy. Simplified, Scaled, Delivered.</p>
          </div>
          
          <div className={styles.column}>
            <h3>Shop</h3>
            <ul>
              <li><Link href="/shop">ALL PRODUCTS</Link></li>
              <li><Link href="/shop?category=fruit-veg">PRODUCE</Link></li>
              <li><Link href="/shop?category=meat-poultry">BUTCHERY</Link></li>
              <li><Link href="/shop?category=pantry">PANTRY</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h3>Partners</h3>
            <ul>
              <li><Link href="/register?role=supplier">BECOME A VENDOR</Link></li>
              <li><Link href="/login">MERCHANT PORTAL</Link></li>
              <li><Link href="/about">OUR STORY</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h3>Connect</h3>
            <p>Get elite marketplace updates.</p>
            <form className={styles.newsletter}>
              <input type="email" placeholder="ENTER EMAIL" suppressHydrationWarning />
              <button type="submit" suppressHydrationWarning>JOIN</button>
            </form>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} GUMA BASKET. ALL RIGHTS RESERVED. 🇿🇦</p>
          <div className={styles.legal}>
            <Link href="/terms">TERMS</Link>
            <Link href="/privacy">PRIVACY</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
