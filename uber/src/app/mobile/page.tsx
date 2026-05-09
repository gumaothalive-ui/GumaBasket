'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';

const DispatchMap = dynamic(() => import('@/components/DispatchMap'), { ssr: false });

// ── Geocode an address string via Nominatim (free, no API key) ─────────────
async function geocodeAddress(query: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=za`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

// ── Watch driver's real GPS position continuously ────────────────────────────
function useWatchDriverGPS(onUpdate: (coords: [number, number]) => void) {
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => onUpdate([pos.coords.latitude, pos.coords.longitude]),
      err => console.warn('GPS Watch Error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [onUpdate]);
}

function getDriverGPS(): Promise<[number, number] | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  });
}

// ── Background Driver Tracking Task ─────────────────────────────────────────
function useDriverLiveTracking(isOnline: boolean, driverName: string | null) {
  useEffect(() => {
    if (!isOnline || !driverName) return;
    
    let [fn, ln] = driverName.split(' ');
    
    const interval = setInterval(async () => {
      const coords = await getDriverGPS();
      if (coords) {
        let q = supabase
          .from('drivers')
          .update({ lat: coords[0], lng: coords[1], last_ping: new Date().toISOString(), status: 'available' })
          .eq('first_name', fn);
        if (ln) q = q.eq('last_name', ln);
        else q = q.is('last_name', null);
        await q;
      }
    }, 10000); // Send GPS to Supabase every 10 seconds
    return () => clearInterval(interval);
  }, [isOnline, driverName]);
}

// ── Types ──────────────────────────────────────────────────────────────────
type SellerOrder = {
  id: number;
  order_ref: string;
  vendor_name: string;
  product_title: string;
  quantity: number;
  customer_amount: number;
  status: string;
  created_at: string;
  customerName?: string;
  customerAddress?: string;
  customerLat?: number;
  customerLng?: number;
};

type TripState = 'idle' | 'to_store' | 'at_store' | 'to_customer' | 'delivered';

type MapCoords = {
  store: [number, number] | undefined;
  customer: [number, number] | undefined;
  driver: [number, number] | undefined;
};

export default function MobileDispatch() {
  const [driverName, setDriverName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  useEffect(() => {
    import('../login/actions').then(m => m.getDriverSession()).then(res => {
      if (res.success && res.driverName) {
        let finalName = res.driverName;
        try {
          const parsed = JSON.parse(res.driverName);
          if (parsed && parsed.name) finalName = parsed.name;
        } catch(e) {}
        setDriverName(finalName);
      } else {
        window.location.href = '/login';
      }
      setAuthLoading(false);
    });
  }, []);

  const [tripState, setTripState] = useState<TripState>('idle');
  const [navInstruction, setNavInstruction] = useState('');
  const [logs, setLogs] = useState([{ time: new Date().toLocaleTimeString(), text: 'System ready. Waiting for dispatch.' }]);
  const [activeTab, setActiveTab] = useState<'home' | 'earnings'>('home');
  const [mapCoords, setMapCoords] = useState<MapCoords>({ store: undefined, customer: undefined, driver: undefined });
  const [mapKey, setMapKey] = useState('init');
  const [geocoding, setGeocoding] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Chat state ────────────────────────────────────────
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: 'customer' | 'driver'; text: string; created_at: string; read_at: string | null }[]>([]);
  const [chatConnected, setChatConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Call state (WebRTC WiFi calling) ────────────────────
  const [callState, setCallState] = useState<'idle' | 'calling' | 'active' | 'incoming'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callerName, setCallerName] = useState('Customer');
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Real order state ──────────────────────────────────
  const [pendingOrders, setPendingOrders] = useState<SellerOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<SellerOrder | null>(null);
  const [polling, setPolling] = useState(true);

  useDriverLiveTracking(true, driverName);

  useWatchDriverGPS(useCallback((coords) => {
    setMapCoords(prev => ({ ...prev, driver: coords }));
  }, []));

  useEffect(() => {
    if (!activeOrder?.order_ref) return;
    const ref = activeOrder.order_ref;

    const ship = (activeOrder as any).shipping_address;
    if (ship?.phone) setCustomerPhone(ship.phone);
    else if ((activeOrder as any).customerPhone) setCustomerPhone((activeOrder as any).customerPhone);

    supabase
      .from('order_messages')
      .select('*')
      .eq('order_ref', ref)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setChatMessages(data as any); });

    if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    const channel = supabase
      .channel(`order_chat:${ref}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_ref=eq.${ref}` }, (payload) => {
        const msg = payload.new as any;
        setChatMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender === 'customer') setUnreadCount(n => n + 1);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_messages', filter: `order_ref=eq.${ref}` }, (payload) => {
        const updated = payload.new as any;
        setChatMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
      })
      .subscribe(s => setChatConnected(s === 'SUBSCRIBED'));
    chatChannelRef.current = channel;

    return () => { if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current); };
  }, [activeOrder?.order_ref]);

  useEffect(() => {
    if (showChat && activeOrder?.order_ref) {
      setUnreadCount(0);
      supabase
        .from('order_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('order_ref', activeOrder.order_ref)
        .eq('sender', 'customer')
        .is('read_at', null)
        .then(() => {
          setChatMessages(prev =>
            prev.map(m => m.sender === 'customer' && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)
          );
        });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [showChat, activeOrder?.order_ref]);

  useEffect(() => {
    if (!activeOrder?.order_ref) return;
    const ref = activeOrder.order_ref;
    if (callChannelRef.current) supabase.removeChannel(callChannelRef.current);
    const ch = supabase
      .channel(`call:${ref}`)
      .on('broadcast', { event: 'call_offer' }, ({ payload }) => {
        pendingOfferRef.current = payload.sdp;
        setCallerName(payload.callerName || 'Customer');
        setCallState('incoming');
        if (ringtoneRef.current) { ringtoneRef.current.loop = true; ringtoneRef.current.play().catch(() => {}); }
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
      .on('broadcast', { event: 'call_ice' }, async ({ payload }) => {
        if (payload.from !== 'customer') return;
        if (peerRef.current?.remoteDescription) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          iceCandidateQueue.current.push(payload.candidate);
        }
      })
      .on('broadcast', { event: 'call_reject' }, () => { 
        if (!pendingOfferRef.current) logMissedCallToDb();
        cleanupCall(); setCallState('idle'); 
      })
      .on('broadcast', { event: 'call_end' }, () => { cleanupCall(); setCallState('idle'); })
      .subscribe();
    callChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [activeOrder?.order_ref]);

  useEffect(() => {
    if (callState !== 'active') { setCallDuration(0); return; }
    const t = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

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
    if (!activeOrder?.order_ref) return;
    await supabase.from('order_messages').insert({
      order_ref: activeOrder.order_ref,
      sender: 'driver',
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
      alert('Your browser does not support microphone access.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) callChannelRef.current?.send({ type: 'broadcast', event: 'call_ice', payload: { candidate, from: 'driver' } });
      };
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      callChannelRef.current?.send({ type: 'broadcast', event: 'call_offer', payload: { sdp: offer, callerName: driverName || 'Driver' } });
      setCallState('incoming');
      setCallerName((activeOrder as any)?.customerName || 'Customer');
      setShowChat(false);
      
      callTimeoutRef.current = setTimeout(() => {
        handleMissedCall();
      }, 30000);
    } catch (err: any) {
      alert(`Microphone access denied.`);
    }
  };

  const answerCall = async () => {
    if (!pendingOfferRef.current) return;
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) callChannelRef.current?.send({ type: 'broadcast', event: 'call_ice', payload: { candidate, from: 'driver' } });
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
      declineCall();
    }
  };

  const declineCall = () => {
    callChannelRef.current?.send({ type: 'broadcast', event: 'call_reject', payload: {} });
    cleanupCall();
    setCallState('idle');
  };

  const endCall = () => {
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

  const handleChatSend = async () => {
    if (!chatInput.trim() || !activeOrder?.order_ref || isSending) return;
    setIsSending(true);
    const text = chatInput.trim();
    setChatInput('');
    await supabase.from('order_messages').insert({ order_ref: activeOrder.order_ref, sender: 'driver', text });
    setIsSending(false);
  };

  const fetchPendingOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('seller_orders')
      .select('*')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data && data.length > 0) {
      const enrichedData = await Promise.all(data.map(async (order) => {
        try {
          const { data: parentOrder } = await supabase
            .from('orders')
            .select('shipping_address')
            .ilike('id', `${order.order_ref}%`)
            .single();
            
          let name = 'Customer';
          let address = '42 Beach Boulevard, Sea Point';
          let lat: number | undefined;
          let lng: number | undefined;
          let phone: string | undefined;
          
          if (parentOrder?.shipping_address) {
            const ship = parentOrder.shipping_address as any;
            if (ship.firstName) name = `${ship.firstName} ${ship.lastName || ''}`.trim();
            if (ship.address) address = ship.address;
            if (ship.lat) lat = ship.lat;
            if (ship.lng) lng = ship.lng;
            if (ship.phone) phone = ship.phone;
          }
          
          return { ...order, customerName: name, customerAddress: address, customerLat: lat, customerLng: lng, customerPhone: phone };
        } catch (e) {
          return { ...order, customerName: 'Customer', customerAddress: '42 Beach Boulevard, Sea Point' };
        }
      }));
      setPendingOrders(enrichedData);
    } else if (data && data.length === 0) {
      setPendingOrders([]);
    }
  }, []);

  useEffect(() => {
    if (!polling) return;
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 5000);
    return () => clearInterval(interval);
  }, [polling, fetchPendingOrders]);

  const playTTS = (text: string, isNav = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isNav) setNavInstruction(text);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18);
    } catch {}
    setTimeout(() => {
      const msg = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find(v => v.name === 'Google UK English Female') || voices.find(v => v.lang === 'en-GB');
      if (ukVoice) msg.voice = ukVoice;
      window.speechSynthesis.speak(msg);
    }, 180);
  };

  const addLog = (text: string) => setLogs(prev => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  const handleTurn = (instruction: string) => { addLog(instruction); playTTS(instruction, true); };

  const acceptOrder = async (order: SellerOrder) => {
    await supabase.from('seller_orders').update({ status: 'accepted' }).eq('order_ref', order.order_ref);
    if (driverName) {
      let [fn, ln] = driverName.split(' ');
      let q = supabase.from('drivers').update({ current_order_ref: order.order_ref }).eq('first_name', fn);
      if (ln) q = q.eq('last_name', ln); else q = q.is('last_name', null);
      await q;
    }
    setActiveOrder(order);
    setPolling(false);
    setPendingOrders([]);
    setLogs([]);
    const phone = (order as any).customerPhone;
    if (phone) setCustomerPhone(phone);
    addLog(`Order #${order.order_ref} assigned.`);
    playTTS(`New order assigned. Proceed to ${order.vendor_name}.`, true);

    const realCustomerAddress = order.customerAddress || '123 Dropoff Street';
    setActiveOrder({ ...order, storeAddress: `${order.vendor_name}`, deliveryAddress: realCustomerAddress } as any);
    setGeocoding(true);
    addLog('Locating pickup...');

    let custCoords = (order.customerLat && order.customerLng) ? [order.customerLat, order.customerLng] : await geocodeAddress(`${realCustomerAddress}, South Africa`);
    const storeCoords = await geocodeAddress(`${order.vendor_name} Headquarters, South Africa`);
    try {
      const driverGPS = await getDriverGPS();
      if (storeCoords || driverGPS || custCoords) {
        setMapCoords({ driver: driverGPS || undefined, store: storeCoords || undefined, customer: custCoords as [number,number] | undefined });
        setMapKey(`trip-${order.order_ref}-${Date.now()}`);
      }
    } catch (e) {} finally { setGeocoding(false); }
    setTripState('to_store');
  };

  const handleArrival = async (destination: string) => {
    if (destination === 'store') {
      addLog(`Arriving at ${activeOrder?.vendor_name || 'store'}`);
      playTTS(`Arriving at ${activeOrder?.vendor_name || 'the store'}.`, true);
      setTripState('at_store');
      setTimeout(() => {
        addLog('Order retrieved. En route to customer.');
        playTTS('Order retrieved. En route to customer.', true);
        setTripState('to_customer');
      }, 3000);
    } else if (destination === 'customer') {
      addLog(`Delivered!`);
      playTTS('You have arrived. Order delivered.', true);
      if (activeOrder) {
        await supabase.from('seller_orders').update({ status: 'delivered' }).eq('order_ref', activeOrder.order_ref);
        await supabase.from('orders').update({ status: 'delivered' }).ilike('id', `${activeOrder.order_ref.toLowerCase()}%`);
        if (driverName) {
          let [fn, ln] = driverName.split(' ');
          let q = supabase.from('drivers').update({ current_order_ref: null }).eq('first_name', fn);
          if (ln) q = q.eq('last_name', ln); else q = q.is('last_name', null);
          await q;
        }
      }
      setTripState('delivered');
      setTimeout(() => setNavInstruction(''), 5000);
      setTimeout(() => { setPolling(true); setActiveOrder(null); setTripState('idle'); }, 6000);
    }
  };

  const groupedOrders = pendingOrders.reduce<Record<string, SellerOrder[]>>((acc, o) => {
    if (!acc[o.order_ref]) acc[o.order_ref] = [];
    acc[o.order_ref].push(o);
    return acc;
  }, {});
  const topOrderRef = Object.keys(groupedOrders)[0];
  const topOrderItems = topOrderRef ? groupedOrders[topOrderRef] : [];
  const topOrderTotal = topOrderItems.reduce((s, o) => s + o.customer_amount, 0);

  if (authLoading || !driverName) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>Loading...</div>;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.statusBar} />

      {activeTab === 'home' && (
        <>
          <div className={styles.mapWrap}>
            <DispatchMap key={mapKey} tripState={tripState} storeCoords={mapCoords.store} customerCoords={mapCoords.customer} driverCoords={mapCoords.driver} storeName={activeOrder?.vendor_name || 'Unity C&C'} onArrival={handleArrival} onTurn={handleTurn} />
          </div>

          <button className={styles.topLeft} onClick={() => setDrawerOpen(true)}>☰</button>

          <div className={styles.topPill}>
            <div className={styles.topPillDot} />
            <span className={styles.topPillText}>{polling ? 'Online' : 'On Trip'}</span>
          </div>

          {(tripState === 'to_store' || tripState === 'to_customer' || tripState === 'at_store') && navInstruction && (
            <div className={styles.navBanner}>
              <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              <div className={styles.navBannerText}>{navInstruction}</div>
            </div>
          )}

          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetScroll}>
              
              {(tripState === 'idle' || tripState === 'delivered') && (
                topOrderRef ? (
                  <div className={styles.waitCard}>
                    <div className={styles.waitPulseBar} />
                    <div className={styles.waitHeader}>
                      <span className={styles.waitTitle}>NEW ORDER</span>
                      <span className={styles.waitLive}>Live</span>
                    </div>
                    <div className={styles.waitAmount}>R{topOrderTotal.toFixed(2)}</div>
                    <div className={styles.waitMeta}>{topOrderItems.length} items · 2.4 km · ~12 min</div>
                    
                    <div className={styles.itemsList}>
                      {topOrderItems.slice(0, 2).map((item, i) => (
                        <div key={i} className={styles.itemRow}>
                          <span>{item.quantity}× {item.product_title}</span>
                          <span style={{ fontWeight: 700 }}>R{item.customer_amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className={styles.addresses}>
                      <div className={styles.addrRow}>
                        <div className={styles.addrTitle}>Pickup</div>
                        <div className={styles.addrSub}>{topOrderItems[0]?.vendor_name || 'Unity C&C'}</div>
                      </div>
                      <div className={`${styles.addrRow} ${styles.drop}`}>
                        <div className={styles.addrTitle}>Dropoff</div>
                        <div className={styles.addrSub}>{topOrderItems[0]?.customerAddress || '42 Beach Boulevard'}</div>
                      </div>
                    </div>

                    <button className={styles.acceptBtn} onClick={() => acceptOrder(topOrderItems[0])}>Accept Delivery</button>
                  </div>
                ) : (
                  <div className={styles.scanWait}>
                    <div className={styles.scanEmoji}>📡</div>
                    <div className={styles.scanText}>Waiting for a customer<br/>to place an order</div>
                  </div>
                )
              )}

              {tripState !== 'idle' && tripState !== 'delivered' && activeOrder && (
                <>
                  <div className={styles.tripCard}>
                    <div className={styles.tripTop}>
                      <span className={styles.orderRef}>#{activeOrder.order_ref}</span>
                      <span className={styles.badge}>
                        {tripState === 'to_store' ? 'To Store' : tripState === 'at_store' ? 'At Store' : 'To Customer'}
                      </span>
                    </div>
                    <div className={styles.addresses} style={{ marginBottom: 0 }}>
                      <div className={styles.addrRow}>
                        <div className={styles.addrTitle}>{activeOrder.vendor_name}</div>
                      </div>
                      <div className={`${styles.addrRow} ${styles.drop}`}>
                        <div className={styles.addrTitle}>{(activeOrder as any).customerName || 'Customer'}</div>
                      </div>
                    </div>
                    <button className={styles.chatBtn} onClick={() => setShowChat(true)}>
                      💬 Chat {unreadCount > 0 && <span style={{ background: '#ff3b30', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{unreadCount}</span>}
                    </button>
                  </div>
                  <div className={styles.logBox}>
                    {logs.map((log, i) => (
                      <div key={i} className={styles.logEntry}>
                        <span className={styles.logTime}>{log.time}</span>
                        <span>{log.text}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'earnings' && (
        <div className={styles.earningsPage}>
          <h2 className={styles.sectionTitle}>Earnings</h2>
          <div className={styles.balCard}>
            <div className={styles.balLabel}>Available Balance</div>
            <div className={styles.balAmount}>R3,450.00</div>
            <button className={styles.cashBtn}>Cash out now</button>
          </div>
          <div className={styles.tripsCard}>
            <div className={styles.tripsTitle}>Recent Trips</div>
            <div className={styles.tripItem}>
              <div><div className={styles.tripDate}>Today, 2:45 PM</div><div className={styles.tripRoute}>Unity C&C → Customer</div></div>
              <div className={styles.tripAmt}>+R45.00</div>
            </div>
            <div className={styles.tripItem}>
              <div><div className={styles.tripDate}>Today, 1:15 PM</div><div className={styles.tripRoute}>Fresh Farms → Michael B.</div></div>
              <div className={styles.tripAmt}>+R75.00</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabBar}>
        <button className={styles.tabItem} onClick={() => setActiveTab('home')}>
          <div className={`${styles.tabIcon} ${activeTab==='home'?styles.active:''}`}>🧭</div>
          <div className={`${styles.tabLabel} ${activeTab==='home'?styles.active:''}`}>Map</div>
        </button>
        <button className={styles.tabItem} onClick={() => setActiveTab('earnings')}>
          <div className={`${styles.tabIcon} ${activeTab==='earnings'?styles.active:''}`}>💰</div>
          <div className={`${styles.tabLabel} ${activeTab==='earnings'?styles.active:''}`}>Earnings</div>
        </button>
        <button className={styles.tabItem}>
          <div className={styles.tabIcon}>📋</div>
          <div className={styles.tabLabel}>Account</div>
        </button>
      </div>

      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}>
          <div className={styles.drawer}>
            <div className={styles.drawerHead}>
              <div className={styles.drawerAvatar}>{driverName.charAt(0)}</div>
              <div className={styles.drawerName}>{driverName}</div>
              <div className={styles.drawerStatus}>● Active Driver</div>
            </div>
            <div className={styles.drawerMenu}>
              <div className={styles.drawerItem} onClick={() => { setActiveTab('home'); setDrawerOpen(false); }}>🧭 Home</div>
              <div className={styles.drawerItem} onClick={() => { setActiveTab('earnings'); setDrawerOpen(false); }}>💰 Earnings</div>
              <div className={styles.drawerItem}>📋 Settings</div>
            </div>
            <div className={styles.drawerFooter}>
              <button className={styles.signOutBtn} onClick={async () => { import('../login/actions').then(m => m.driverLogout().then(() => window.location.href = '/login')); }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {showChat && (
        <div className={styles.chatOverlay}>
          <div className={styles.chatHead}>
            <button className={styles.chatBack} onClick={() => setShowChat(false)}>←</button>
            <div className={styles.chatAvatar}>🧑‍🤝‍🧑</div>
            <div style={{ flex: 1 }}>
              <div className={styles.chatName}>{(activeOrder as any)?.customerName || 'Customer'}</div>
              <div className={styles.chatSub}>{chatConnected ? 'Live' : 'Connecting...'}</div>
            </div>
            <button className={styles.callBtn} onClick={initiateCall}>📞</button>
          </div>
          <div className={styles.chatMessages}>
            {chatMessages.map(msg => {
              const isMine = msg.sender === 'driver';
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div className={`${styles.msgBubble} ${isMine ? styles.msgMine : styles.msgTheirs}`}>
                    <div style={{ fontSize: '14px', color: '#111' }}>{msg.text}</div>
                    <div style={{ fontSize: '10px', color: '#888', textAlign: 'right', marginTop: 4 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className={styles.chatInputBar}>
            <input className={styles.chatInput} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleChatSend(); }} placeholder="Message..." />
            <button className={styles.sendBtn} onClick={handleChatSend}>➤</button>
          </div>
        </div>
      )}

      {callState !== 'idle' && (
        <div className={styles.callOverlay}>
          <div className={styles.callStatus}>{callState === 'incoming' && !pendingOfferRef.current ? 'Calling...' : callState === 'incoming' ? 'Incoming Call' : `🟢 ${formatDuration(callDuration)}`}</div>
          <div className={styles.callCenter}>
            <div className={styles.callAvatar}>👤</div>
            <div className={styles.callName}>{callerName}</div>
            <div className={styles.callSub}>{callState === 'incoming' && !pendingOfferRef.current ? 'Ringing...' : 'Voice call'}</div>
          </div>
          <div className={styles.callControls}>
            {callState === 'incoming' && pendingOfferRef.current ? (
              <>
                <div className={styles.callCtrlItem}>
                  <button className={`${styles.callCircle} ${styles.red}`} onClick={declineCall}>📵</button>
                  <div className={styles.callCtrlLabel}>DECLINE</div>
                </div>
                <div className={styles.callCtrlItem}>
                  <button className={`${styles.callCircle} ${styles.green}`} onClick={answerCall}>📞</button>
                  <div className={styles.callCtrlLabel}>ANSWER</div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.callCtrlItem}>
                  <button className={`${styles.callCircle} ${isMuted ? styles.muted : styles.mute}`} onClick={toggleMute}>
                    {isMuted ? '🔇' : '🎤'}
                  </button>
                  <div className={styles.callCtrlLabel}>{isMuted ? 'UNMUTE' : 'MUTE'}</div>
                </div>
                <div className={styles.callCtrlItem}>
                  <button className={`${styles.callCircle} ${styles.red}`} onClick={endCall}>📵</button>
                  <div className={styles.callCtrlLabel}>END</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      <audio ref={ringtoneRef} src="https://upload.wikimedia.org/wikipedia/commons/3/34/Ring_classic_02.ogg" preload="auto" loop style={{ display: 'none' }} />
    </div>
  );
}
