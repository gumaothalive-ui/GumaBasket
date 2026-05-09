'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { findClosestMatch } from '@/lib/spellcheck';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const { addToCart, setIsCartOpen } = useCart();

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    setProducts([]);
    setSuggestion(null);

    try {
      // Primary: search by title OR description OR category OR vendor_name
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, category, base_price, premium_price, image_url, vendor_name, unit, stock_quantity')
        .or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%,vendor_name.ilike.%${term}%`)
        .order('stock_quantity', { ascending: false })
        .limit(40);

      if (error) {
        console.error('[Search] Supabase error:', error.message);
        const { data: fallback } = await supabase
          .from('products')
          .select('id, title, description, category, base_price, premium_price, image_url, vendor_name, unit, stock_quantity')
          .ilike('title', `%${term}%`)
          .limit(40);
        setProducts(fallback || []);
        
        // Spell suggestion on fallback
        if (!fallback || fallback.length === 0) {
          const { data: allTitles } = await supabase.from('products').select('title');
          const titles = (allTitles || []).map((p: any) => p.title);
          setSuggestion(findClosestMatch(term, titles));
        }
      } else {
        setProducts(data || []);
        
        // If no results, do fuzzy spell check
        if (!data || data.length === 0) {
          const { data: allTitles } = await supabase.from('products').select('title');
          const titles = (allTitles || []).map((p: any) => p.title);
          setSuggestion(findClosestMatch(term, titles));
        }
      }
    } catch (e) {
      console.error('[Search] Exception:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search when URL ?q= changes
  useEffect(() => {
    if (initialQ) {
      setQuery(initialQ);
      handleSearch(initialQ);
    }
  }, [initialQ, handleSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleQuickAdd = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    e.stopPropagation();
    const price = Number(p.premium_price) || Number(p.base_price) * 1.15;
    addToCart({ id: p.id, title: p.title, price, quantity: 1, imageUrl: p.image_url, vendorName: p.vendor_name });
    setAddedId(p.id);
    setIsCartOpen(true);
    setTimeout(() => setAddedId(null), 2000);
  };

  const getPrice = (p: any) => (Number(p.premium_price) || Number(p.base_price) * 1.15).toFixed(2);

  return (
    <div style={{ minHeight: '80vh', padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Search Bar */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#94a3b8' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for groceries, brands, vendors..."
            style={{
              width: '100%', padding: '16px 16px 16px 48px',
              fontSize: 16, borderRadius: 12,
              border: '2px solid #e2e8f0',
              outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#0f172a')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '16px 32px', background: '#0f172a', color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 800,
            fontSize: 15, cursor: 'pointer', letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          Search
        </button>
      </form>

      {/* Spell suggestion banner */}
      {suggestion && !loading && searched && products.length === 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <span style={{ fontSize: 15, color: '#92400e' }}>
            Did you mean{' '}
            <button
              onClick={() => { setQuery(suggestion); router.push(`/search?q=${encodeURIComponent(suggestion)}`); }}
              style={{ fontWeight: 900, color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 15, padding: 0 }}
            >
              &quot;{suggestion}&quot;
            </button>
            ?
          </span>
        </div>
      )}

      {/* Results Header */}
      {searched && !loading && (
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>
              {products.length > 0 ? `${products.length} result${products.length !== 1 ? 's' : ''}` : 'No results found'}
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {products.length > 0 ? `Showing results for "${initialQ || query}"` : `We couldn't find anything matching "${initialQ || query}"`}
            </p>
          </div>
          {products.length > 0 && (
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              {products.filter(p => p.stock_quantity > 0).length} in stock
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#f1f5f9', animationName: 'pulse' }}>
              <div style={{ height: 160, background: '#e2e8f0' }} />
              <div style={{ padding: 16 }}>
                <div style={{ height: 14, background: '#e2e8f0', borderRadius: 6, marginBottom: 8, width: '70%' }} />
                <div style={{ height: 12, background: '#e2e8f0', borderRadius: 6, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {!loading && products.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {products.map(p => {
            const isAdded = addedId === p.id;
            const outOfStock = p.stock_quantity === 0;
            return (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block', opacity: outOfStock ? 0.6 : 1 }}
              >
                <div style={{
                  border: '1.5px solid #e2e8f0', borderRadius: 16, overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s', background: '#fff',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(15,23,42,0.1)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Image */}
                  <div style={{ height: 160, background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🛒</div>
                    )}
                    {outOfStock && (
                      <div style={{ position: 'absolute', top: 10, left: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>
                        OUT OF STOCK
                      </div>
                    )}
                    {!outOfStock && p.stock_quantity <= 5 && p.stock_quantity > 0 && (
                      <div style={{ position: 'absolute', top: 10, left: 10, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20 }}>
                        ONLY {p.stock_quantity} LEFT
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                      {p.vendor_name || 'GUMA BASKET'}
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.3, color: '#0f172a' }}>
                      {p.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>R {getPrice(p)}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{p.unit || 'Each'}</span>
                    </div>
                    <button
                      onClick={(e) => handleQuickAdd(e, p)}
                      disabled={outOfStock}
                      style={{
                        width: '100%', marginTop: 12, padding: '10px',
                        background: isAdded ? '#05a357' : outOfStock ? '#f1f5f9' : '#0f172a',
                        color: outOfStock ? '#94a3b8' : '#fff',
                        border: 'none', borderRadius: 8,
                        fontWeight: 800, fontSize: 13,
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                        fontFamily: 'inherit',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {isAdded ? '✓ Added!' : outOfStock ? 'Out of Stock' : '+ Add to Cart'}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && searched && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
          <h2 style={{ fontWeight: 900, marginBottom: 12 }}>No products found</h2>
          <p style={{ color: '#64748b', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
            We couldn&apos;t find any items matching &quot;{initialQ || query}&quot;. Try a different keyword.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Strawberry', 'Mango', 'Milk', 'Bread', 'Chicken'].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); router.push(`/search?q=${s}`); }}
                style={{
                  padding: '10px 20px', background: '#f1f5f9', border: 'none',
                  borderRadius: 100, fontWeight: 700, cursor: 'pointer', fontSize: 14
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 32 }}>
            <Link href="/shop" style={{ fontWeight: 700, color: '#0f172a', textDecoration: 'underline' }}>
              Browse all products →
            </Link>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!loading && !searched && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛍️</div>
          <h2 style={{ fontWeight: 900, marginBottom: 8 }}>What are you looking for?</h2>
          <p style={{ color: '#64748b', marginBottom: 32 }}>Search across all vendors and products</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Fresh Fruit', 'Vegetables', 'Dairy', 'Meat', 'Snacks', 'Bakery'].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); router.push(`/search?q=${s}`); }}
                style={{
                  padding: '10px 20px', background: '#0f172a', color: '#fff',
                  border: 'none', borderRadius: 100, fontWeight: 700,
                  cursor: 'pointer', fontSize: 13
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
