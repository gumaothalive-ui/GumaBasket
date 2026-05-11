import Link from 'next/link';
import { fetchProductById } from '@/services/marketplaceService';
import { AddToCartControls } from '@/components/ui/AddToCartControls';
import { WishlistButton } from '@/components/ui/WishlistButton';
import { ProductReviews } from '@/components/ui/ProductReviews';
import styles from './page.module.css';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProductById(id);
  if (!product) return { title: 'Product Not Found | Guma Basket' };
  
  const displayPrice = product.premium_price || product.price || 0;
  
  return {
    title: `${product.title} | Guma Basket`,
    description: `Buy ${product.title} online for R${displayPrice.toFixed(2)}. Best quality, fast delivery from Guma Basket.`,
    openGraph: {
      images: [product.image_url || 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=600&h=600&fit=crop'],
    }
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h1>Product Not Found</h1>
        <p>Sorry, the product you are looking for does not exist.</p>
        <Link href="/" style={{ color: '#111111', fontWeight: 800 }}>GO BACK HOME</Link>
      </div>
    );
  }

  return (
    <div className={`container ${styles.detailLayout}`}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs}>
        <Link href="/">Home</Link> / <Link href={`/${product.category}`}>{product.category.toUpperCase().replace('-', ' & ')}</Link> / <span>{product.title}</span>
      </nav>

      <div className={styles.mainContent}>
        {/* Image Section */}
        <div className={styles.imageGallery}>
          <div className={styles.mainImageContainer}>
            <img 
              src={product.image_url || 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=600&h=600&fit=crop'} 
              alt={product.title} 
              className={styles.mainImage} 
            />
          </div>
        </div>

        {/* Info Section */}
        <div className={styles.productInfo}>
          <header className={styles.infoHeader}>
            <div className={styles.brand}>{product.vendor_name || 'GUMA BASKET'}</div>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.ratingRow}>
              <div className={styles.stars}>
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className={s <= Math.floor(product.rating || 4.5) ? styles.starFilled : styles.starEmpty} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className={styles.reviewText}>{product.reviewCount || 0} Reviews</span>
            </div>
          </header>

          <div className={styles.priceBox}>
             <div className={styles.price}>
               R {product.premium_price.toFixed(2)}
               {product.original_price && product.original_price > product.premium_price && (
                 <span className={styles.oldPrice} style={{ 
                   fontSize: '0.9rem', 
                   color: '#999', 
                   textDecoration: 'line-through', 
                   marginLeft: '10px',
                   fontWeight: 400 
                 }}>
                   R {product.original_price.toFixed(2)}
                 </span>
               )}
             </div>
             <div className={styles.unitPrice}>(R {product.premium_price.toFixed(2)} / {product.unit || 'Each'})</div>
          </div>

          <div className={styles.stickyCartBar} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div style={{ flex: 1 }}>
              <AddToCartControls 
                product={{
                  id: product.id,
                  title: product.title,
                  price: product.premium_price,
                  imageUrl: product.image_url || 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400&h=400&fit=crop',
                  vendorName: product.vendor_name
                }} 
              />
            </div>
            <WishlistButton productId={product.id} productTitle={product.title} />
          </div>

          <div className={styles.stockAvailability}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>In Stock ({product.stock_quantity || 0} units)</span>
          </div>

          <div className={styles.description}>
            <h3>Product Overview</h3>
            <p>{product.description || 'Quality selection from Guma Basket verified sellers.'}</p>
          </div>

          <div className={styles.detailsList}>
            <div className={styles.detailItem}>
              <strong>Vendor:</strong> {product.vendor_name || 'Guma Basket Partner'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews Section ── */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
