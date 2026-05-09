'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import styles from './cart.module.css';
import Link from 'next/link';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, subtotal, totalItems } = useCart();
  const { user } = useAuth();
  
  // Tiered Delivery Pricing (matches checkout logic)
  const shippingFee = subtotal >= 500 || subtotal === 0 
    ? 0 
    : subtotal < 100 
      ? 15.00 
      : subtotal < 250 
        ? 25.00 
        : 35.00;
  const grandTotal = subtotal + shippingFee;

  if (cart.length === 0) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>YOUR CART IS EMPTY</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Looks like you haven't added anything to your cart yet.</p>
        <Link href="/shop" style={{ background: 'black', color: 'white', padding: '1rem 2rem', fontWeight: 900, borderRadius: '4px' }}>START SHOPPING</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 20px' }}>
      <h1 className={styles.title}>SHOPPING CART ({totalItems})</h1>

      <div className={styles.cartContent}>
        <div className={styles.itemsList}>
          {cart.map(item => (
            <div key={item.id} className={styles.cartItem}>
              <div className={styles.itemImage}>
                <img src={item.imageUrl} alt={item.title} />
              </div>
              <div className={styles.itemDetails}>
                <div className={styles.itemHeader}>
                  <Link href={`/product/${item.id}`}><h3>{item.title}</h3></Link>
                  <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>REMOVE</button>
                </div>
                <p className={styles.vendor}>{item.vendorName || 'GUMA BASKET Supplier'}</p>
                <div className={styles.itemFooter}>
                  <div className={styles.quantityControls}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <div className={styles.itemPrice}>
                    R {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summaryCard}>
          <h2>ORDER SUMMARY</h2>
          <div className={styles.summaryRow}>
            <span>SUBTOTAL</span>
            <span>R {subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>SHIPPING</span>
            {shippingFee === 0 ? (
              <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>FREE (Over R500)</span>
            ) : (
              <span>R {shippingFee.toFixed(2)}</span>
            )}
          </div>
          <div className={styles.totalRow}>
            <span>TOTAL</span>
            <span>R {grandTotal.toFixed(2)}</span>
          </div>

          {user ? (
            // ✅ Logged in — go to checkout
            <Link href="/checkout" className={styles.checkoutBtn} style={{ display: 'block', textAlign: 'center' }}>
              PROCEED TO SECURE CHECKOUT
            </Link>
          ) : (
            // 🔒 Guest — show login wall
            <div className={styles.loginWall}>
              <div className={styles.loginWallIcon}>🔒</div>
              <p className={styles.loginWallText}>
                <strong>Sign in to checkout</strong><br />
                Create a free account to complete your purchase and track your orders.
              </p>
              <Link href="/login?redirect=/checkout" className={styles.checkoutBtn} style={{ display: 'block', textAlign: 'center' }}>
                SIGN IN TO CHECKOUT
              </Link>
              <Link href="/register?redirect=/checkout" className={styles.registerLink}>
                New here? Create a free account →
              </Link>
            </div>
          )}

          <div className={styles.secureBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            100% SECURE CHECKOUT
          </div>
        </div>
      </div>
    </div>
  );
}
