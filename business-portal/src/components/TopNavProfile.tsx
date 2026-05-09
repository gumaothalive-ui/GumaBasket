'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getStoreLogo, saveStoreLogo } from '@/app/profile/actions';
import { logout } from '@/app/login/actions';

export default function TopNavProfile({ vendorName }: { vendorName: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vendorName) {
      getStoreLogo(vendorName).then(res => {
        if (res.success && res.logoUrl) {
          setLogoUrl(res.logoUrl);
        }
      });
    }
  }, [vendorName]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const uploadForm = new FormData();
    uploadForm.set('file', file);
    uploadForm.set('vendorName', vendorName + '-logo');

    try {
      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadResult = await uploadRes.json();

      if (uploadResult.success) {
        const saveRes = await saveStoreLogo(vendorName, uploadResult.url);
        if (saveRes.success) {
          setLogoUrl(uploadResult.url);
        } else {
          alert('Failed to save to database: ' + saveRes.error);
        }
      } else {
         alert('Upload failed: ' + uploadResult.error);
      }
    } catch (err: any) {
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  if (!vendorName) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '6px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
      
      <div 
         onClick={() => fileInputRef.current?.click()}
         style={{ width: 36, height: 36, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', cursor: 'pointer', overflow: 'hidden', opacity: isUploading ? 0.5 : 1, position: 'relative', border: '2px solid #e2e8f0', flexShrink: 0 }}
         title="Click to upload profile picture / store logo"
         onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
         onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={vendorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          vendorName[0].toUpperCase()
        )}
      </div>
      
      <div className="dashboard-header-brand-text" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{vendorName}</span>
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }}></div>
        <button onClick={async () => {
          await logout();
          window.location.href = '/login';
        }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textDecoration: 'none' }}>LOGOUT</button>
      </div>
    </div>
  );
}
