'use client';

import { useState, useEffect } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: 400,
      background: '#0f172a',
      color: '#fff',
      padding: '16px 20px',
      borderRadius: 16,
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 9999,
      animation: 'slideUp 0.4s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          width: 40, height: 40, background: '#fff', borderRadius: 10, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
        }}>
          📦
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '14px' }}>Install Guma Seller</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Fast, offline & premium</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button 
          onClick={() => setShowBanner(false)}
          style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: 700, padding: '8px' }}
        >
          Not now
        </button>
        <button 
          onClick={handleInstallClick}
          style={{ 
            background: '#fff', color: '#0f172a', border: 'none', 
            padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: '13px' 
          }}
        >
          Install
        </button>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
