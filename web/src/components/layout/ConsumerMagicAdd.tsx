'use client';

import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { fetchSAProducts } from '@/services/marketplaceService';
import { useRouter } from 'next/navigation';
import styles from './ConsumerMagicAdd.module.css';

export function ConsumerMagicAdd() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const { addToCart, setIsCartOpen } = useCart();
  const router = useRouter();

  const handleMagicAdd = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    setStatus('Analyzing request...');
    
    try {
      const allProducts = await fetchSAProducts();
      const query = input.toLowerCase();
      
      const qtyMatch = query.match(/(\d+)/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      
      const searchTerm = query
        .replace(/add|to cart|please|get me|i want|find/gi, '')
        .replace(/\d+/g, '')
        .trim();

      const match = allProducts.find(p => 
        p.title.toLowerCase().includes(searchTerm) || 
        p.vendor_name?.toLowerCase().includes(searchTerm)
      );

      // Always go to search results so user can browse + add to cart
      router.push(`/search?q=${encodeURIComponent(input.trim())}`);
      setInput('');
      setStatus('');
    } catch (error) {
      setStatus('Search failed. Try again?');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.magicContainer}>
      <div className={styles.inputWrapper}>
        <div className={styles.searchIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input 
          type="text" 
          placeholder='SEARCH...' 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleMagicAdd()}
          className={styles.magicInput}
          suppressHydrationWarning
        />
        <button 
          onClick={handleMagicAdd} 
          disabled={isProcessing || !input.trim()}
          className={styles.magicBtn}
          suppressHydrationWarning
        >
          {isProcessing ? '⟳' : 'SEARCH'}
        </button>
      </div>
      {status && <div className={styles.status}>{status}</div>}
    </div>
  );
}
