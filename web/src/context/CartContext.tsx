'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  quantity: number;
  vendorName?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'gumabasket_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on init (migrate old key if present)
  useEffect(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
      || localStorage.getItem('GUMA BASKET_cart'); // migrate old key
    if (saved) {
      try {
        setCart(JSON.parse(saved));
        localStorage.removeItem('GUMA BASKET_cart'); // clean up old key
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const openCart = () => setIsCartOpen(true);

  // Sync with localStorage — always, even when empty (so clearCart() persists)
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any) => {
    const addedQty = product.quantity && product.quantity > 0 ? product.quantity : 1;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + addedQty } : item
        );
      }
      return [...prev, {
        id: product.id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: addedQty,
        vendorName: product.vendorName
      }];
    });
    // Auto-open cart drawer when adding
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      isCartOpen,
      setIsCartOpen,
      openCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

const SAFE_DEFAULT: CartContextType = {
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
  openCart: () => {},
};

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    // If called outside of CartProvider (e.g., SSR mismatch), return safe defaults
    // instead of crashing the entire page.
    if (typeof window === 'undefined') return SAFE_DEFAULT;
    console.warn('[GUMA BASKET] useCart called outside of CartProvider — using safe defaults.');
    return SAFE_DEFAULT;
  }
  return context;
}
