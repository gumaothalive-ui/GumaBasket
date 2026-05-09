'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only show on the root or login/signup, not deeply nested routes
    if (pathname && !['/', '/login', '/signup'].includes(pathname)) {
      setShow(false);
      return;
    }

    // Check if we already showed it this session
    if (sessionStorage.getItem('splashShown')) {
      setShow(false);
      return;
    }

    // Set standard timers
    const fadeTimer = setTimeout(() => {
      setFade(true); // Start fading out after 14.5 seconds
    }, 14500);

    const hideTimer = setTimeout(() => {
      setShow(false); // Fully unmount after 15 seconds
      sessionStorage.setItem('splashShown', 'true');
    }, 15000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fade ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: 'none',
      }}
    >
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'pulse 2s infinite ease-in-out'
        }}
      >
        <img 
          src="/logo.png" 
          alt="Guma Basket" 
          style={{ width: '50vw', minWidth: '250px', maxWidth: '450px', height: 'auto', filter: 'drop-shadow(0px 15px 30px rgba(0,0,0,0.15))' }} 
        />
        <div style={{
          width: '40px',
          height: '4px',
          background: '#f1f5f9',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            background: '#0f172a',
            width: '100%',
            animation: 'loadingBar 15s linear forwards'
          }} />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes loadingBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}} />
    </div>
  );
}
