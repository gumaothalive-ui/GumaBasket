'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './track.module.css';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div style={{height: '100vh', width: '100vw', background: '#f1f5f9', display: 'grid', placeItems: 'center', color: '#64748b'}}>Loading live tracker...</div>
});

const CHAT_BG = '#E5DDD5';

type ChatMessage = {
  id: string;
  order_ref: string;
  sender: 'customer' | 'driver';
  text: string;
  created_at: string;
  read_at: string | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [orderRef, setOrderRef] = useState('');
  const [dbError, setDbError] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [etaMins, setEtaMins] = useState(15);
  const [progressPct, setProgressPct] = useState(0);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Real driver info from DB ──
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    vehicle: string;
    plate: string;
    phone: string;
    avatarUrl: string;
  } | null>(null);

  // ── Call state (WebRTC WiFi calling) ──
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callerName, setCallerName] = useState('Your Driver');
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  // Hide global header/footer/bottom-nav on this full-screen page
  useEffect(() => {
    document.body.classList.add('page-track');
    return () => document.body.classList.remove('page-track');
  }, []);

  const currentStep = progressPct > 0.95 ? 4 : progressPct > 0.15 ? 3 : progressPct > 0.05 ? 2 : 1;

  const [customerLocation, setCustomerLocation] = useState<[number, number] | undefined>(undefined);

  // ── Load existing messages for this order ──
  const loadMessages = useCallback(async (ref: string) => {
    const { data } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_ref', ref)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  }, []);

  // ── Mark driver messages as read (called when customer opens chat) ──
  const markDriverMessagesRead = useCallback(async (ref: string) => {
    await supabase
      .from('order_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('order_ref', ref)
      .eq('sender', 'driver')
      .is('read_at', null);
    // Update local state instantly so ticks flip without waiting for realtime
    setMessages(prev =>
      prev.map(m => m.sender === 'driver' && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)
    );
  }, []);

  // ── Subscribe to Supabase Realtime for new messages and read receipts ──
  const subscribeToChat = useCallback((ref: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`order_chat:${ref}`)
      // New message
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_ref=eq.${ref}` }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      // Read receipt update — tick flips to blue when driver marks as read
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_messages', filter: `order_ref=eq.${ref}` }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
      })
      .subscribe((status) => setChatConnected(status === 'SUBSCRIBED'));

    channelRef.current = channel;
  }, []);

  // ── Clean up channel on unmount ──
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ── Start chat + call channel once we have a ref ──
  useEffect(() => {
    if (orderRef) {
      loadMessages(orderRef);
      subscribeToChat(orderRef);

      // Subscribe to call signaling
      if (callChannelRef.current) supabase.removeChannel(callChannelRef.current);
      const ch = supabase
        .channel(`call:${orderRef}`)
        .on('broadcast', { event: 'call_offer' }, ({ payload }) => {
          pendingOfferRef.current = payload.sdp;
          setCallerName(payload.callerName || 'Your Driver');
          setCallState('incoming');
          // Play ringtone
          if (ringtoneRef.current) { ringtoneRef.current.loop = true; ringtoneRef.current.play().catch(() => {}); }
        })
        .on('broadcast', { event: 'call_ice' }, async ({ payload }) => {
          if (payload.from !== 'driver') return;
          if (peerRef.current?.remoteDescription) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
        })
        .on('broadcast', { event: 'call_answer' }, async ({ payload }) => {
          if (!peerRef.current) return;
          if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          for (const c of iceCandidateQueue.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(c));
          }
          iceCandidateQueue.current = [];
          setCallState('active');
        })
        .on('broadcast', { event: 'call_reject' }, () => { 
          if (!pendingOfferRef.current) logMissedCallToDb(); // we were the caller
          cleanupCall(); setCallState('idle'); 
        })
        .on('broadcast', { event: 'call_end' }, () => { cleanupCall(); setCallState('idle'); })
        .subscribe();
      callChannelRef.current = ch;
    }
  }, [orderRef, loadMessages, subscribeToChat]);

  // ── Mark driver messages as read when customer opens the chat ──
  useEffect(() => {
    if (showContact && orderRef) {
      markDriverMessagesRead(orderRef);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [showContact, orderRef, markDriverMessagesRead]);

  // ── Auto-scroll when new messages arrive ──
  useEffect(() => {
    if (showContact) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages, showContact]);

  // ── Call duration timer ──
  useEffect(() => {
    if (callState !== 'active') { setCallDuration(0); return; }
    const t = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    pendingOfferRef.current = null;
    iceCandidateQueue.current = [];
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    setIsMuted(false);
  };

  const logMissedCallToDb = async () => {
    if (!orderRef) return;
    await supabase.from('order_messages').insert({
      order_ref: orderRef,
      sender: 'customer',
      text: '📞 Missed voice call',
    });
  };

  const handleMissedCall = () => {
    callChannelRef.current?.send({ type: 'broadcast', event: 'call_end', payload: {} });
    logMissedCallToDb();
    cleanupCall();
    setCallState('idle');
  };

  const initiateCall = async () => {
    if (callState !== 'idle') return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support or allow microphone access (HTTPS is required).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
        video: false 
      });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) callChannelRef.current?.send({ type: 'broadcast', event: 'call_ice', payload: { candidate, from: 'customer' } });
      };
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      callChannelRef.current?.send({ type: 'broadcast', event: 'call_offer', payload: { sdp: offer, callerName: 'Customer' } });
      setCallState('incoming'); // We use 'incoming' visually for ringing state, but conceptually it's 'calling'
      setCallerName(driverInfo?.name || 'Your Driver');
      setShowContact(false); // Hide chat to show full screen call UI
      
      callTimeoutRef.current = setTimeout(() => {
        handleMissedCall();
      }, 30000);
    } catch (err: any) {
      console.error('Mic error:', err);
      alert(`Microphone access denied: ${err?.message || 'Unknown error'}. Please click the lock icon in the URL bar and ensure Microphone is allowed.`);
    }
  };

  const answerCall = async () => {
    if (!pendingOfferRef.current) return;
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support or allow microphone access (HTTPS is required).');
      declineCall();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
        video: false 
      });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) callChannelRef.current?.send({ type: 'broadcast', event: 'call_ice', payload: { candidate, from: 'customer' } });
      };
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callChannelRef.current?.send({ type: 'broadcast', event: 'call_answer', payload: { sdp: answer } });
      for (const c of iceCandidateQueue.current) await pc.addIceCandidate(new RTCIceCandidate(c));
      iceCandidateQueue.current = [];
      setCallState('active');
    } catch (err: any) {
      console.error('Mic error:', err);
      alert(`Microphone access denied: ${err?.message || 'Unknown error'}. Please click the lock icon in the URL bar and ensure Microphone is allowed.`);
      declineCall();
    }
  };

  const declineCall = () => {
    callChannelRef.current?.send({ type: 'broadcast', event: 'call_reject', payload: {} });
    cleanupCall();
    setCallState('idle');
  };

  const endCall = () => {
    // If we are calling and they haven't answered, it's a missed call
    if (!pendingOfferRef.current && callState === 'incoming') {
      handleMissedCall();
      return;
    }
    callChannelRef.current?.send({ type: 'broadcast', event: 'call_end', payload: {} });
    cleanupCall();
    setCallState('idle');
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  useEffect(() => {
    if (orderId) {
      handleSearchInternal(orderId);
      const interval = setInterval(() => handleSearchInternal(orderId, true), 3000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const handleSearchInternal = async (id: string, isPolling = false) => {
    if (!isPolling) setIsLoading(true);

    try {
      let cleanId = id.replace(/^(dm-|DM-)/i, '').trim();
      let searchRef = cleanId.toUpperCase();

      if (searchRef.length >= 32 && searchRef.includes('-')) {
        searchRef = searchRef.split('-')[0];
      } else if (searchRef.length > 8) {
        searchRef = searchRef.substring(0, 8);
      }

      let currentStatus = 'pending';
      const { data: refData } = await supabase
        .from('seller_orders')
        .select('order_ref, status')
        .eq('order_ref', searchRef)
        .limit(1)
        .maybeSingle();

      if (refData?.order_ref) {
        cleanId = refData.order_ref;
        currentStatus = refData.status;
        setOrderRef(refData.order_ref); // set once for chat
      }
      setOrderStatus(currentStatus);

      // ── Fetch real driver who accepted this order ──
      if (currentStatus === 'accepted' || currentStatus === 'delivered') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('first_name, last_name, vehicle_make, vehicle_model, vehicle_color, plate_number, phone, avatar_url')
          .eq('current_order_ref', cleanId)
          .maybeSingle();

        if (driverData) {
          setDriverInfo({
            name: `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim() || 'Your Driver',
            vehicle: `${driverData.vehicle_color || ''} ${driverData.vehicle_make || ''} ${driverData.vehicle_model || ''}`.trim() || 'Vehicle',
            plate: driverData.plate_number || '',
            phone: driverData.phone || '+27600000000',
            avatarUrl: driverData.avatar_url || '',
          });
        }
      }

      const { data } = await supabase
        .from('orders')
        .select('shipping_address')
        .ilike('id', `${cleanId.toLowerCase()}%`)
        .maybeSingle();

      if (data?.shipping_address?.lat && data?.shipping_address?.lng) {
        setCustomerLocation([data.shipping_address.lat, data.shipping_address.lng]);
      } else {
        setDbError('DB Data Null');
      }
    } catch (err: any) {
      console.warn('Could not find real coordinates for tracking, using fallback.');
      setDbError(err?.message || 'Unknown error occurred');
    }

    setTimeout(() => { setIsLoading(false); setIsSearched(true); }, 800);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    handleSearchInternal(orderId.trim());
  };

  const getHeadingText = () => {
    if (orderStatus === 'pending') return 'Order Confirmed';
    if (orderStatus === 'preparing') return 'Preparing your order';
    if (orderStatus === 'ready') return 'Finding a Driver...';
    if (orderStatus === 'accepted') return `Arriving in ${etaMins} min`;
    if (orderStatus === 'delivered') return 'Delivered';
    return 'Loading...';
  };

  const getETAText = () => progressPct >= 0.98 ? 'Arrived' : `${etaMins} min`;

  // ── Send a real message to Supabase ──
  const handleSend = async () => {
    if (!chatInput.trim() || !orderRef || isSending) return;
    setIsSending(true);
    const text = chatInput.trim();
    setChatInput('');

    const { error } = await supabase.from('order_messages').insert({
      order_ref: orderRef,
      sender: 'customer',
      text,
    });

    if (error) {
      console.error('Failed to send message:', error.message);
      // Restore input on failure
      setChatInput(text);
    }
    setIsSending(false);
  };

  return (
    <>
      <div className={styles.container}>

      {/* Background Map */}
      <div className={styles.mapBackground}>
        {isSearched && (
          <>
            <LiveMap
              isActive={isSearched && orderStatus === 'accepted'}
              customerLocation={customerLocation}
              orderRef={orderId.replace(/^(dm-|DM-)/i, '').trim()}
              onProgress={({ pct, mins }) => { setProgressPct(pct); setEtaMins(mins); }}
            />
            {/* Overlay for waiting driver */}
            {(orderStatus === 'ready' || orderStatus === 'pending' || orderStatus === 'preparing') && (
              <div style={{
                position: 'absolute',
                top: 100,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '12px 24px',
                borderRadius: '100px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 1000,
                border: '2px solid #05a357',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📡</span>
                <span style={{ fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>Waiting for driver to take order...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating back button */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backBtn}>←</Link>
      </div>

      {/* Search or Tracking UI */}
      {!isSearched ? (
        <div className={styles.searchOverlay}>
          <div className={styles.searchCard}>
            <h1>Track Order</h1>
            <p>Enter your order ID to locate your delivery live.</p>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                placeholder="e.g. DM-92302"
                className={styles.searchInput}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
              <button type="submit" className={styles.searchBtn} disabled={isLoading}>
                {isLoading ? 'Locating...' : 'Track'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Tracking Bottom Sheet ── */}
      {isSearched && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 9999,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
          padding: '8px 20px 36px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          {/* Drag pill */}
          <div
            onClick={() => setIsMinimized(v => !v)}
            style={{ width: '100%', padding: '8px 0 16px', cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ width: 48, height: 5, background: '#e5e7eb', borderRadius: 3, margin: '0 auto' }} />
          </div>

          {/* ETA row */}
          <div style={{ textAlign: 'center', marginBottom: isMinimized ? 0 : 20 }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#000', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {getHeadingText()}
            </div>
            {!isMinimized && <div style={{ fontSize: '0.95rem', color: '#6b7280', marginTop: 4, fontWeight: 500 }}>
              Latest arrival by {new Date(Date.now() + etaMins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>}
          </div>

          {/* Collapsible content */}
          {!isMinimized && (
            <>
              {/* Progress bar */}
              <div style={{ background: '#f3f4f6', height: 4, borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
                <div style={{
                  background: '#000',
                  height: '100%',
                  width: `${Math.max(5, progressPct * 100)}%`,
                  transition: 'width 1s ease-in-out'
                }} />
              </div>

              {/* Driver card */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24, borderBottom: '1px solid #f3f4f6', marginBottom: 20 }}>
                {(orderStatus === 'accepted' || orderStatus === 'delivered') ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: '50%',
                          background: driverInfo?.avatarUrl
                            ? `url(${driverInfo.avatarUrl}) center/cover`
                            : '#e5e7eb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.5rem', fontWeight: 700, color: '#374151',
                        }}>
                          {!driverInfo?.avatarUrl && (driverInfo?.name?.charAt(0).toUpperCase() || '🚗')}
                        </div>
                        <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '2px 6px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <span>4.9</span>
                          <span style={{color: '#000'}}>★</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#000' }}>
                          {driverInfo?.name || 'Your Driver'}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: 2 }}>
                          {driverInfo?.vehicle || 'Vehicle'}
                        </div>
                        {driverInfo?.plate && (
                          <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{driverInfo.plate}</div>
                        )}
                      </div>
                    </div>
                    {/* Chat + Call buttons */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => setShowContact(true)}
                        style={{ width: 44, height: 44, borderRadius: '50%', background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', position: 'relative' }}
                      >
                        💬
                        {/* Unread dot */}
                        {messages.filter(m => m.sender === 'driver').length > 0 && !showContact && (
                          <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, background: '#25D366', borderRadius: '50%', border: '2px solid #fff' }} />
                        )}
                      </button>
                      <a href={`tel:${driverInfo?.phone || '+27600000000'}`} style={{ width: 44, height: 44, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#000', fontSize: '1.2rem' }}>
                        📞
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⏳</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#000' }}>Finding a driver</div>
                      <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: 2 }}>We'll notify you soon</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Details */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                <div style={{ width: 24, display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                  <div style={{ width: 8, height: 8, background: '#000', borderRadius: '50%' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#000' }}>Delivery Address</div>
                  <div style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: 2 }}>Nelson Mandela Bay</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}


      {/* ── Real-time WhatsApp-style Chat ── */}
      {showContact && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          display: 'flex', flexDirection: 'column',
          height: '100%',
          animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}>

          {/* Header */}
          <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 }}>
            <button onClick={() => setShowContact(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer', padding: '4px 8px 4px 0', lineHeight: 1 }}>
              ←
            </button>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: driverInfo?.avatarUrl ? `url(${driverInfo.avatarUrl}) center/cover` : 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '1.1rem',
            }}>
              {!driverInfo?.avatarUrl && (driverInfo?.name?.charAt(0).toUpperCase() || '🚗')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                {driverInfo?.name || 'Your Driver'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>
                {chatConnected ? '🟢 Live · messages are real' : '⏳ Connecting...'}
              </div>
            </div>
            <button
              onClick={initiateCall}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: callState !== 'idle' ? '#25D366' : 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0,
                color: '#fff', transition: 'background 0.2s',
              }}
              title="Call driver via WiFi"
            >
              📞
            </button>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', background: CHAT_BG }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: 12, fontSize: '0.72rem', color: '#555', fontWeight: 600 }}>TODAY</span>
            </div>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginTop: 32 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>👋</div>
                No messages yet. Say hi to your driver!
              </div>
            )}

            {messages.map((msg) => {
              const isMine = msg.sender === 'customer';
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                  <div style={{
                    maxWidth: '78%', padding: '8px 12px 6px',
                    background: isMine ? '#DCF8C6' : '#ffffff',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  }}>
                    {!isMine && (
                      <div style={{ fontSize: '0.7rem', color: '#075E54', fontWeight: 700, marginBottom: 2 }}>Driver</div>
                    )}
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#111', lineHeight: 1.45 }}>{msg.text}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: '0.65rem', color: '#8696a0' }}>{formatTime(msg.created_at)}</span>
                      {isMine && (
                        msg.read_at
                          ? <span style={{ fontSize: '0.75rem', color: '#53bdeb' }}>✓✓</span>   /* blue = read */
                          : <span style={{ fontSize: '0.75rem', color: '#8696a0' }}>✓</span>    /* grey = sent, unread */
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            background: '#f0f0f0',
            padding: '10px 12px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={orderRef ? 'Message your driver...' : 'Waiting for order ref...'}
              disabled={!orderRef}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: '0.95rem', background: '#fff',
                borderRadius: 24, padding: '12px 18px',
                fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                minWidth: 0,
              }}
            />
            <button
              disabled={!chatInput.trim() || isSending || !orderRef}
              onClick={handleSend}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: chatInput.trim() && orderRef ? '#075E54' : '#b0bec5',
                color: '#fff', fontSize: '1.1rem',
                cursor: chatInput.trim() && orderRef ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s'
              }}
            >
              {isSending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ────────────────────────────────────────
        Incoming / Active Call Screen
    ──────────────────────────────────────── */}
    {callState !== 'idle' && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'linear-gradient(180deg, #1a2e1a 0%, #0a1a0a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '70px 40px 60px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Status */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', letterSpacing: 1 }}>
            {callState === 'incoming' && !pendingOfferRef.current ? 'Calling via WiFi...' : callState === 'incoming' ? 'GUMA BASKET · Voice Call' : `🟢  ${formatDuration(callDuration)}`}
          </div>
        </div>

        {/* Avatar + Name */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 130, height: 130, borderRadius: '50%',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3.5rem', margin: '0 auto 24px',
            boxShadow: callState === 'active'
              ? '0 0 0 12px rgba(37,211,102,0.15), 0 0 0 24px rgba(37,211,102,0.07)'
              : '0 0 0 8px rgba(37,211,102,0.1), 0 0 0 18px rgba(37,211,102,0.05)',
            animation: callState === 'incoming' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}>
            🚗
          </div>
          <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 700, marginBottom: 6 }}>
            {callerName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            {callState === 'incoming' && !pendingOfferRef.current ? 'Ringing...' : callState === 'incoming' ? 'Incoming voice call...' : 'Voice call · encrypted'}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: callState === 'incoming' && pendingOfferRef.current ? 60 : 40, alignItems: 'center' }}>
          {callState === 'incoming' && pendingOfferRef.current ? (
            <>
              {/* Decline */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={declineCall} style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#dc2626', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', boxShadow: '0 4px 24px rgba(220,38,38,0.5)',
                }}>📵</button>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: 8 }}>DECLINE</div>
              </div>
              {/* Answer */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={answerCall} style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#25D366', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', boxShadow: '0 4px 24px rgba(37,211,102,0.5)',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }}>📞</button>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: 8 }}>ANSWER</div>
              </div>
            </>
          ) : (
            <>
              {/* Mute */}
              <button onClick={toggleMute} style={{
                width: 64, height: 64, borderRadius: '50%',
                background: isMuted ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, transition: 'background 0.2s',
              }}>
                <span style={{ fontSize: '1.6rem' }}>{isMuted ? '🔇' : '🎤'}</span>
                <span style={{ fontSize: '0.6rem', color: isMuted ? '#000' : 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
              </button>
              {/* End */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={endCall} style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#dc2626', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', boxShadow: '0 4px 24px rgba(220,38,38,0.5)',
                }}>📵</button>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: 6 }}>END CALL</div>
              </div>
            </>
          )}
        </div>
      </div>
    )}

    <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
    <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    <audio ref={ringtoneRef} src="https://upload.wikimedia.org/wikipedia/commons/3/34/Ring_classic_02.ogg" preload="auto" loop style={{ display: 'none' }} />
    </>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div style={{height: '100vh', width: '100vw'}} />}>
      <TrackOrderContent />
    </Suspense>
  );
}
