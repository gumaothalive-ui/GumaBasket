'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import styles from './CartDrawer.module.css';
import Link from 'next/link';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, subtotal, totalItems } = useCart();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>YOUR CART ({totalItems})</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.items}>
          {cart.length === 0 ? (
            <div className={styles.empty}>
              <p>Your cart is empty</p>
              <Link href="/shop" className={styles.shopBtn} onClick={onClose}>START SHOPPING</Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemImage}>
                  <img src={item.imageUrl} alt={item.title} />
                </div>
                <div className={styles.itemInfo}>
                  <h3>{item.title}</h3>
                  <p className={styles.vendor}>{item.vendorName}</p>
                  <p className={styles.price}>R {item.price.toFixed(2)}</p>
                  <div className={styles.quantity}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <button className={styles.remove} onClick={() => removeFromCart(item.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.subtotal}>
              <span>SUBTOTAL</span>
              <span>R {subtotal.toFixed(2)}</span>
            </div>
            <p className={styles.taxNote}>Taxes and shipping calculated at checkout</p>
            <Link href="/checkout" className={styles.checkoutBtn} onClick={onClose}>CHECKOUT</Link>
          </div>
        )}
      </div>
    </div>
  );
}
