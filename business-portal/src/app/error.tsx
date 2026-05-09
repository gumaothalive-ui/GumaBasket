'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function BusinessPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Portal Exception:', error);
  }, [error]);

  let displayMessage = 'We encountered an issue loading your business data.';
  
  if (error.message.includes('fetch') || error.message.includes('network')) {
    displayMessage = 'A network error occurred. Please check your connection to the dashboard.';
  } else if (error.message.includes('permission') || error.message.includes('authorized')) {
    displayMessage = 'You do not have permission to view or modify this vendor data.';
  } else if (error.message.length < 50 && !error.message.includes('Postgres') && !error.message.includes('JSON')) {
    displayMessage = error.message;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a', /* Elite Black Aesthetic */
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'inherit'
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#0f172a',
          color: '#fff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          margin: '0 auto 24px',
          fontWeight: '900'
        }}>
          ⚠️
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Dashboard Interrupted
        </h1>
        
        <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
          {displayMessage}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.2)'
            }}
          >
            Retry Loading
          </button>
          <Link 
            href="/products"
            style={{
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#334155',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '14px',
              border: '1px solid #cbd5e1'
            }}
          >
            Go to Inventory
          </Link>
        </div>
        
        {error.digest && (
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8' }}>
            Ref: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
