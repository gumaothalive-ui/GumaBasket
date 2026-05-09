import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import StoreStatusBanner from '@/components/layout/StoreStatusBanner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'GUMA BASKET | Premium Grocery Delivery',
  description: 'Premium grocery e-commerce and delivery platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GUMA BASKET',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

import SplashScreen from '@/components/ui/SplashScreen';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <SplashScreen />
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <StoreStatusBanner />
              <Suspense fallback={<div style={{ height: '70px' }} />}>
                <Header />
              </Suspense>
              <main className="main-content">{children}</main>
              <Footer />
              <Suspense fallback={null}>
                <BottomNav />
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
