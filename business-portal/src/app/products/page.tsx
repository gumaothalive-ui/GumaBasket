'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProducts, deleteProduct, verifySeller, updateProductDetails } from './actions';
import { getSession } from '../login/actions';

type Product = {
  id: string; title: string; description: string; category: string;
  base_price: number; premium_price: number; unit: string;
  stock_quantity: number; vendor_name: string; created_at: string;
  image_url?: string;
};

const CAT: Record<string, string> = {
  'fruit-veg': '🥦 Fruit & Veg', 'meat-poultry': '🥩 Bouchery', 'bakery': '🍞 Bakery',
  'dairy': '🥛 Dairy', 'pantry': '🫙 Pantry', 'beverages': '☕ Beverages',
  'sweets': '🍬 Sweets', 'frozen': '🧊 Frozen',
};

const CAT_COLOR: Record<string, string> = {
  'fruit-veg': '#dcfce7', 'meat-poultry': '#fee2e2', 'bakery': '#fef9c3',
  'dairy': '#dbeafe', 'pantry': '#f3e8ff', 'beverages': '#fce7f3',
  'sweets': '#ffedd5', 'frozen': '#e0f2fe',
};

import TopNavProfile from '@/components/TopNavProfile';

import { Suspense } from 'react';

function ProductsContent() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);

  const checkAuth = useCallback(async () => {
    const session = await getSession();
    if (!session.success || !session.vendorName) {
      router.push('/login');
      return;
    }
    const currentVendor = session.vendorName;
    setVendorName(currentVendor);

    // Verify account still exists in DB — kicks out deleted/fake sessions
    verifySeller(currentVendor).then(({ valid }) => {
      if (!valid) {
        router.push('/login');
        return;
      }
      getProducts(currentVendor).then(res => {
        setLoading(false);
        if (res.success) setProducts(res.products as Product[]);
        else setError(res.error || 'Error loading products');
      });
    });
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleDelete(id: string) {
    if (!confirm('Remove this product from the marketplace?')) return;
    setDeletingId(id);
    const res = await deleteProduct(id);
    if (res.success) setProducts(prev => prev.filter(p => p.id !== id));
    else alert('Error: ' + res.error);
    setDeletingId(null);
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setEditPrice(p.base_price);
    setEditStock(p.stock_quantity);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const res = await updateProductDetails(editingId, editPrice, editStock);
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === editingId ? { ...p, base_price: editPrice, premium_price: editPrice * 1.15, stock_quantity: editStock } : p));
      setEditingId(null);
    } else {
      alert("Error updating product");
    }
  };

  const sidebarBtn = (item: any) => (
    <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, textDecoration: 'none', fontSize: '14px', fontWeight: item.active ? 800 : 500, background: item.active ? '#f1f5f9' : 'transparent', color: item.active ? '#0f172a' : '#64748b', border: item.active ? '1px solid #cbd5e1' : '1px solid transparent', marginBottom: 6 }}>
      <span style={{ fontSize: 18, opacity: item.active ? 1 : 0.7 }}>{item.icon}</span> {item.label}
    </Link>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Top Nav */}
      <div className="dashboard-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
           <img src="/logo.png" alt="Guma Basket" style={{ height: '48px', width: 'auto' }} />
        </Link>

        {vendorName && <TopNavProfile vendorName={vendorName} />}
      </div>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 16px', marginBottom: 20 }}>DASHBOARD</div>
          {[
            { href: '/products', icon: '🛍️', label: 'Storefront Inventory', active: true },
            { href: '/orders', icon: '📦', label: 'Customer Orders', active: false },
            { href: '/earnings', icon: '📈', label: 'Earnings', active: false },
            { href: '/advertising', icon: '📢', label: 'Marketing & Ads', active: false },
            { href: '/onboarding', icon: '➕', label: 'List New Product', active: false },
            { href: '/profile', icon: '🏪', label: 'Store Profile & Settings', active: false },
          ].map(sidebarBtn)}
          
          <div style={{ marginTop: 'auto', padding: '24px 16px', background: '#f1f5f9', borderRadius: 12, border: '1px solid #cbd5e1' }}>
             <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Merchant Support</p>
             <p style={{ fontSize: '11px', color: '#334155', lineHeight: 1.5 }}>Need help with a shipment? Our elite support team is ready.</p>
             <button style={{ marginTop: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: '11px', fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>CONTACT US</button>
          </div>
        </aside>

        {/* Main */}
        <div className="dashboard-main">
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            
            {/* Stats row */}
            <div className="stat-grid">
              {[
                { icon: '📦', label: 'Total Inventory', val: loading ? '...' : products.length, trend: '+0.0%' },
                { icon: '🌟', label: 'Average Quality', val: '4.9/5', trend: 'TOP 10%' },
                { icon: '💰', label: 'Est. Revenue', val: loading || !products.length ? 'R0.00' : `R${(products.reduce((a, p) => a + p.premium_price, 0)).toLocaleString()}`, trend: 'SOUT ACTIVE' },
              ].map((s, i) => (
                <div key={i} className="premium-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: '40px', position: 'absolute', right: -10, bottom: -10, opacity: 0.05 }}>{s.icon}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: 12, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                     <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>{s.val}</div>
                     <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20 }}>{s.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Header Area */}
            <div className="flex-between-responsive" style={{ marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>Your Storefront Inventory</h1>
                <p style={{ color: '#64748b', fontSize: '15px', marginTop: 4 }}>Manage and track your premium marketplace listings.</p>
              </div>
              <Link href={`/onboarding`} style={{ background: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)', color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '14px 24px', borderRadius: 12, fontSize: '14px', boxShadow: '0 4px 12px rgba(15,23,42,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>➕</span> List a New Product
              </Link>
            </div>

            {/* Error */}
            {error && <div style={{ padding: '16px 20px', borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '14px', fontWeight: 500, marginBottom: 24 }}>⚠️ {error}</div>}

            {/* Empty State */}
            {!loading && !error && products.length === 0 && (
              <div className="premium-card" style={{ padding: '100px 40px', textAlign: 'center', borderStyle: 'dashed', background: 'transparent' }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>📥</div>
                <h3 style={{ fontWeight: 900, fontSize: '22px', marginBottom: 12, color: '#0f172a' }}>Your catalog is empty</h3>
                <p style={{ color: '#64748b', fontSize: '16px', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>Start your premium experience by listing your first high-quality product for our shoppers.</p>
                <Link href={`/onboarding`} style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '16px 32px', borderRadius: 12, fontSize: '15px' }}>+ List your first product</Link>
              </div>
            )}

            {/* Product List Grid */}
            {!loading && products.length > 0 && (
              <div className="product-grid">
                {products.map(p => (
                  <div key={p.id} className="premium-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Visual Preview */}
                    <div style={{ height: 160, background: CAT_COLOR[p.category] || '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                       {p.image_url ? (
                         <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                         <div style={{ fontSize: 64, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>{(CAT[p.category] || '📦').split(' ')[0]}</div>
                       )}
                       <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.9)', padding: '5px 12px', borderRadius: 30, fontSize: '11px', fontWeight: 800, color: '#475569', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', letterSpacing: '0.02em', zIndex: 2 }}>
                          {CAT[p.category] || p.category}
                       </div>
                    </div>


                    <div style={{ padding: '24px' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', marginBottom: 8, letterSpacing: '-0.5px' }}>{p.title}</h3>
                      <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6, marginBottom: 24, minHeight: 42 }}>{p.description}</p>

                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>GUMA BASKET Price</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>R{p.premium_price?.toFixed(2)}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Your Earnings (incl):</span>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>R{p.base_price?.toFixed(2)} / {p.unit}</span>
                         </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                         <div style={{ display: 'flex', gap: 6 }}>
                            {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#fbbf24', fontSize: '14px' }}>★</span>)}
                         </div>
                         <div style={{ fontSize: '12px', fontWeight: 700, color: p.stock_quantity > 0 ? '#10b981' : '#ef4444' }}>
                            ● {p.stock_quantity > 0 ? `${p.stock_quantity} IN STOCK` : 'OUT OF STOCK'}
                         </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ width: '100%', background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 10, padding: '12px', fontSize: '12px', fontWeight: 700, color: '#ef4444', cursor: deletingId === p.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                          {deletingId === p.id ? 'REMOVING...' : 'DELETE'}
                        </button>
                        <button onClick={() => handleEdit(p)} style={{ width: '100%', background: '#0f172a', border: 'none', borderRadius: 10, padding: '12px', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                          EDIT
                        </button>
                      </div>
                    </div>
                    {/* Inline Editor Overlay */}
                    {editingId === p.id && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', padding: 24, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ marginBottom: 16 }}>Edit {p.title}</h4>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Base Price (Your Earning)</label>
                          <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(parseFloat(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }} />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Stock Quantity</label>
                          <input type="number" value={editStock} onChange={e => setEditStock(parseInt(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                          <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '12px', background: '#e2e8f0', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={handleSaveEdit} style={{ flex: 1, padding: '12px', background: '#05a357', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link href={`/products`} className="mobile-nav-item active">
          <span className="mobile-nav-icon">🛍️</span>
          <span>Inventory</span>
        </Link>
        <Link href={`/orders`} className="mobile-nav-item">
          <span className="mobile-nav-icon">📦</span>
          <span>Orders</span>
        </Link>
        <Link href={`/onboarding`} className="mobile-nav-item">
          <span className="mobile-nav-icon">➕</span>
          <span>List Item</span>
        </Link>
        <Link href={`/profile`} className="mobile-nav-item">
          <span className="mobile-nav-icon">🏪</span>
          <span>Profile</span>
        </Link>
      </nav>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading inventory...</div>}>
      <ProductsContent />
    </Suspense>
  );
}

