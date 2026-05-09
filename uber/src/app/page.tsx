'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';

const DispatchMap = dynamic(() => import('@/components/DispatchMap'), { ssr: false });

// ── Verified real-world GPS coordinate for Unit Cash & Carry ────────────────
// Address: 4 Jackson Street, Korsten, Gqeberha (Port Elizabeth), 6020
// Verified via: geocords.com, yep.co.za, onlinedirectory.online
const UNIT_CC_GQEBERHA: [number, number] = [-33.921, 25.584];

// Fallback driver start: Greenacres / North End, Gqeberha (~3 km from store)
// Used when the browser cannot get a real GPS fix
export const GQEBERHA_DRIVER_FALLBACK: [number, number] = [-33.9607, 25.6022];

// ── Geocode an address string via Nominatim (free, no API key) ─────────────
async function geocodeAddress(query: string): Promise<[number, number] | null> {
  // ── Real, verified GPS coordinates for known stores ──────────────────────
  // All name variants for Unit Cash & Carry in Gqeberha are mapped here so
  // the lookup succeeds regardless of how the vendor name is stored in the DB.
  const knownLocations: Record<string, [number, number]> = {
    'unit cash and carry':   UNIT_CC_GQEBERHA, // 4 Jackson St, Korsten, Gqeberha
    'unit cash & carry':     UNIT_CC_GQEBERHA,
    'unit c&c':              UNIT_CC_GQEBERHA,
    'unit c & c':            UNIT_CC_GQEBERHA,
    'unity cash and carry':  UNIT_CC_GQEBERHA,
    'unity cash & carry':    UNIT_CC_GQEBERHA,
    'unity c&c':             UNIT_CC_GQEBERHA,
    'united cash and carry': UNIT_CC_GQEBERHA,
    'united cash & carry':   UNIT_CC_GQEBERHA,
  };
  
  const normalizedQuery = query.toLowerCase();
  for (const [key, coords] of Object.entries(knownLocations)) {
    if (normalizedQuery.includes(key)) return coords;
  }

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

async function getIPLocation(): Promise<[number, number] | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    const d = await res.json();
    if (d.latitude && d.longitude) {
      console.info(`🌐 IP location: ${d.city}, ${d.country_name} (${d.latitude}, ${d.longitude})`);
      return [d.latitude, d.longitude];
    }
  } catch (_) {}
  return null;
}

function getDriverGPS(): Promise<[number, number]> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      getIPLocation().then(ip => resolve(ip || GQEBERHA_DRIVER_FALLBACK));
      return;
    }
    // Try low-accuracy first (much faster, uses network/WiFi)
    navigator.geolocation.getCurrentPosition(
      pos => {
        console.info(`GPS ✔️ Real position: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        resolve([pos.coords.latitude, pos.coords.longitude]);
      },
      async err => {
        console.warn('GPS: Browser location failed —', err.message, '— trying IP location...');
        const ip = await getIPLocation();
        if (ip) { resolve(ip); return; }
        console.warn('GPS: IP location also failed — using Gqeberha fallback');
        resolve(GQEBERHA_DRIVER_FALLBACK);
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 8000 }
    );
  });
}

// ── Haversine Distance (Simulating Spatial Indexing / ETA routing) ─────────
function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

export default function DispatchDashboard() {
  const [driverName, setDriverName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Mobile shell state
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    import('./login/actions').then(m => m.getDriverSession()).then(res => {
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
  const [navTelemetry, setNavTelemetry] = useState({ 
    distanceRem: 0, 
    timeRem: 0, 
    nextStepDist: undefined as number | undefined,
    nextStepInstruction: undefined as string | undefined
  });
  const [logs, setLogs] = useState([{ time: new Date().toLocaleTimeString(), text: 'System ready. Waiting for dispatch.' }]);
  const [activeTab, setActiveTab] = useState<'map' | 'earnings'>('map');
  const [hasBank, setHasBank] = useState(false);
  const [mapCoords, setMapCoords] = useState<MapCoords>({ store: undefined, customer: undefined, driver: undefined });
  // Always holds the latest GPS position from the watch — avoids stale closure in simulateTrip
  const liveGPSRef = useRef<[number, number]>(GQEBERHA_DRIVER_FALLBACK);
  const [mapKey, setMapKey] = useState('init');
  const [geocoding, setGeocoding] = useState(false);

  // Chat and Call state logic remains identical
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: 'customer' | 'driver'; text: string; created_at: string; read_at: string | null }[]>([]);
  const [chatConnected, setChatConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  const [pendingOrders, setPendingOrders] = useState<SellerOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<SellerOrder | null>(null);
  const [polling, setPolling] = useState(true);

  // === UBER OFFER POPUP STATE ===
  const [activeOffer, setActiveOffer] = useState<SellerOrder[] | null>(null);
  const [offerCountdown, setOfferCountdown] = useState(15);
  const [skippedOrders, setSkippedOrders] = useState<Set<string>>(new Set());

  // === BOTTOM SHEET STATE ===
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Auto-maximize the sheet if idle, minimize if navigating
  useEffect(() => {
    if (tripState === 'to_store' || tripState === 'to_customer') {
      setSheetMinimized(true);
    } else {
      setSheetMinimized(false);
    }
  }, [tripState, activeOrder]);

  useDriverLiveTracking(true, driverName);

  useWatchDriverGPS(useCallback((coords) => {
    liveGPSRef.current = coords;          // keep ref in sync for simulateTrip
    setMapCoords(prev => ({ ...prev, driver: coords }));
  }, []));

  useEffect(() => {
    if (!activeOrder?.order_ref) return;
    const ref = activeOrder.order_ref;

    const ship = (activeOrder as any).shipping_address;
    if (ship?.phone) setCustomerPhone(ship.phone);
    else if ((activeOrder as any).customerPhone) setCustomerPhone((activeOrder as any).customerPhone);

    supabase.from('order_messages').select('*').eq('order_ref', ref).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setChatMessages(data as any); });

    if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    const channel = supabase.channel(`order_chat:${ref}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_ref=eq.${ref}` }, (payload) => {
        const msg = payload.new as any;
        setChatMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender === 'customer') setUnreadCount(n => n + 1);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_messages', filter: `order_ref=eq.${ref}` }, (payload) => {
        const updated = payload.new as any;
        setChatMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
      }).subscribe(s => setChatConnected(s === 'SUBSCRIBED'));
    chatChannelRef.current = channel;

    return () => { if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current); };
  }, [activeOrder?.order_ref]);

  useEffect(() => {
    if (showChat && activeOrder?.order_ref) {
      setUnreadCount(0);
      supabase.from('order_messages').update({ read_at: new Date().toISOString() })
        .eq('order_ref', activeOrder.order_ref).eq('sender', 'customer').is('read_at', null)
        .then(() => {
          setChatMessages(prev => prev.map(m => m.sender === 'customer' && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m));
        });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [showChat, activeOrder?.order_ref]);

  useEffect(() => {
    if (!activeOrder?.order_ref) return;
    const ref = activeOrder.order_ref;
    if (callChannelRef.current) supabase.removeChannel(callChannelRef.current);
    const ch = supabase.channel(`call:${ref}`)
      .on('broadcast', { event: 'call_offer' }, ({ payload }) => {
        pendingOfferRef.current = payload.sdp; setCallerName(payload.callerName || 'Customer'); setCallState('incoming');
        if (ringtoneRef.current) { ringtoneRef.current.loop = true; ringtoneRef.current.play().catch(() => {}); }
      })
      .on('broadcast', { event: 'call_answer' }, async ({ payload }) => {
        if (!peerRef.current) return;
        if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const c of iceCandidateQueue.current) await peerRef.current.addIceCandidate(new RTCIceCandidate(c));
        iceCandidateQueue.current = []; setCallState('active');
      })
      .on('broadcast', { event: 'call_ice' }, async ({ payload }) => {
        if (payload.from !== 'customer') return;
        if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        else iceCandidateQueue.current.push(payload.candidate);
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

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const cleanupCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
    peerRef.current?.close(); peerRef.current = null; pendingOfferRef.current = null; iceCandidateQueue.current = [];
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    setIsMuted(false);
  };

  const logMissedCallToDb = async () => {
    if (!activeOrder?.order_ref) return;
    await supabase.from('order_messages').insert({ order_ref: activeOrder.order_ref, sender: 'driver', text: '📞 Missed voice call' });
  };

  const handleMissedCall = () => {
    callChannelRef.current?.send({ type: 'broadcast', event: 'call_end', payload: {} });
    logMissedCallToDb(); cleanupCall(); setCallState('idle');
  };

  const initiateCall = async () => {
    if (callState !== 'idle') return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Browser lacks microphone support.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => { if (candidate) callChannelRef.current?.send({ type: 'broadcast', event: 'call_ice', payload: { candidate, from: 'driver' } }); };
      pc.ontrack = (e) => { if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); } };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      callChannelRef.current?.send({ type: 'broadcast', event: 'call_offer', payload: { sdp: offer, callerName: driverName || 'Driver' } });
      setCallState('incoming'); setCallerName((activeOrder as any)?.customerName || 'Customer'); setShowChat(false);
      callTimeoutRef.current = setTimeout(handleMissedCall, 30000);
    } catch (err: any) { alert(`Microphone access denied.`); }
  };

  const answerCall = async () => {
    if (!pendingOfferRef.current) return;
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => { if (candidate) callChannelRef.current?.send({ type: 'broadcast', event: 'call_ice', payload: { candidate, from: 'driver' } }); };
      pc.ontrack = (e) => { if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); } };
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      callChannelRef.current?.send({ type: 'broadcast', event: 'call_answer', payload: { sdp: answer } });
      for (const c of iceCandidateQueue.current) await pc.addIceCandidate(new RTCIceCandidate(c));
      iceCandidateQueue.current = []; setCallState('active');
    } catch (err: any) { declineCall(); }
  };

  const declineCall = () => { callChannelRef.current?.send({ type: 'broadcast', event: 'call_reject', payload: {} }); cleanupCall(); setCallState('idle'); };
  const endCall = () => {
    if (!pendingOfferRef.current && callState === 'incoming') { handleMissedCall(); return; }
    callChannelRef.current?.send({ type: 'broadcast', event: 'call_end', payload: {} }); cleanupCall(); setCallState('idle');
  };

  const toggleMute = () => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setIsMuted(m => !m); };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !activeOrder?.order_ref || isSending) return;
    setIsSending(true); const text = chatInput.trim(); setChatInput('');
    await supabase.from('order_messages').insert({ order_ref: activeOrder.order_ref, sender: 'driver', text });
    setIsSending(false);
  };

  const fetchPendingOrders = useCallback(async () => {
    const { data, error } = await supabase.from('seller_orders').select('*').eq('status', 'ready').order('created_at', { ascending: false }).limit(10);
    if (!error && data && data.length > 0) {
      
      const driverLoc = await getDriverGPS(); // Get real-time loc for dispatch matching

      const enrichedData = await Promise.all(data.map(async (order) => {
        try {
          const { data: parentOrder } = await supabase.from('orders').select('shipping_address').ilike('id', `${order.order_ref}%`).single();
          let name = 'Customer'; let address = 'Customer Location'; let lat: number | undefined; let lng: number | undefined; let phone: string | undefined;
          if (parentOrder?.shipping_address) {
            const ship = parentOrder.shipping_address as any;
            if (ship.firstName) name = `${ship.firstName} ${ship.lastName || ''}`.trim();
            if (ship.address) address = ship.address; if (ship.lat) lat = ship.lat; if (ship.lng) lng = ship.lng; if (ship.phone) phone = ship.phone;
          }
          
          // Try to get store coordinates to calculate distance (Simulating Uber's ETA scoring)
          let distanceKm = 999;
          if (driverLoc) {
             const storeCoords = await geocodeAddress(`${order.vendor_name}, South Africa`);
             if (storeCoords) distanceKm = getDistanceKM(driverLoc[0], driverLoc[1], storeCoords[0], storeCoords[1]);
          }

          return { ...order, customerName: name, customerAddress: address, customerLat: lat, customerLng: lng, customerPhone: phone, distance: distanceKm };
        } catch (e) { return { ...order, customerName: 'Customer', customerAddress: 'Customer Location', distance: 999 }; }
      }));
      
      // Dispatch algorithm: Sort by closest distance first!
      enrichedData.sort((a, b) => a.distance - b.distance);
      
      setPendingOrders(enrichedData);
    } else if (data && data.length === 0) setPendingOrders([]);
  }, []);

  useEffect(() => {
    if (!polling) return; 
    fetchPendingOrders();
    
    // === UBER-STYLE ARCHITECTURE: WebSockets instead of Polling ===
    // Listen for real-time inserts to the database using Supabase Realtime (WebSockets)
    const orderChannel = supabase.channel('dispatch_radar')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'seller_orders',
        filter: 'status=eq.ready' 
      }, () => {
        // Instantly refresh radar when a new order drops (sub-100ms response)
        fetchPendingOrders();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'seller_orders',
      }, () => {
        fetchPendingOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(orderChannel); };
  }, [polling, fetchPendingOrders]);

  // === TRIGGER UBER POPUP WHEN NEW ORDER IS DETECTED ===
  useEffect(() => {
    if (tripState !== 'idle' || activeOffer) return;
    const grouped = pendingOrders.reduce<Record<string, SellerOrder[]>>((acc, o) => {
      if (!acc[o.order_ref]) acc[o.order_ref] = []; acc[o.order_ref].push(o); return acc;
    }, {});
    const topRef = Object.keys(grouped)[0];
    
    if (topRef && !skippedOrders.has(topRef)) {
      setActiveOffer(grouped[topRef]);
      setOfferCountdown(15);
      
      // Play Uber ping sound
      try {
        const audio = new Audio('https://upload.wikimedia.org/wikipedia/commons/c/c2/Sonar_Ping.ogg');
        audio.loop = true;
        audio.play().catch(()=>{});
        (window as any).currentPingAudio = audio;
      } catch (e) {}
    }
  }, [pendingOrders, tripState, skippedOrders, activeOffer]);

  // === COUNTDOWN TIMER ===
  useEffect(() => {
    if (!activeOffer) return;
    const timer = setInterval(() => {
      setOfferCountdown(prev => {
        if (prev <= 1) {
          if ((window as any).currentPingAudio) {
             (window as any).currentPingAudio.pause();
          }
          setSkippedOrders(s => new Set(s).add(activeOffer[0].order_ref));
          setActiveOffer(null);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeOffer]);

  // ── Female voice navigator (multi-strategy, works on Chrome / Edge / Safari) ──
  const playTTS = (text: string, isNav = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isNav) setNavInstruction(text);

    // Navigation chime — two rising tones before speech
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
    } catch {}

    const speak = (voices: SpeechSynthesisVoice[]) => {
      const msg = new SpeechSynthesisUtterance(text);

      // Strategy 1 – exact name matches (most reliable)
      const femaleByName = voices.find(v => [
        'Google UK English Female',
        'Microsoft Zira - English (United States)',
        'Microsoft Hazel Desktop - English (Great Britain)',
        'Microsoft Susan - English (Great Britain)',
        'Samantha',   // macOS / iOS
        'Karen',      // macOS Australian
        'Moira',      // macOS Irish
        'Tessa',      // macOS South African 🇿🇦
        'Fiona',      // macOS Scottish
        'Victoria',   // macOS
      ].includes(v.name));

      // Strategy 2 – partial name pattern
      const femaleByPattern = !femaleByName
        ? voices.find(v => /female|zira|hazel|susan|ava|allison|kate|serena|nora|paulina|helena|monica|veena|siri/i.test(v.name))
        : undefined;

      // Strategy 3 – en-GB or en-AU (naturally higher pitch, perceived as female)
      const femaleByLocale = (!femaleByName && !femaleByPattern)
        ? voices.find(v => v.lang === 'en-GB' || v.lang === 'en-AU')
        : undefined;

      // Strategy 4 – any English voice + pitch boost
      const anyEnglish = (!femaleByName && !femaleByPattern && !femaleByLocale)
        ? voices.find(v => v.lang.startsWith('en'))
        : undefined;

      const chosen = femaleByName || femaleByPattern || femaleByLocale || anyEnglish;
      if (chosen) msg.voice = chosen;

      msg.rate  = 0.93;  // Slightly slower — clearer for driving
      msg.pitch = (femaleByName || femaleByPattern) ? 1.05 : 1.25; // Boost if no female found
      msg.volume = 1.0;
      window.speechSynthesis.speak(msg);
    };

    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        speak(voices);
      } else {
        // Voices not yet loaded — wait for the event (happens on first load)
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          speak(window.speechSynthesis.getVoices());
        };
      }
    }, 200);
  };

  const addLog = (text: string) => setLogs(prev => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  const handleTurn = (instruction: string) => { addLog(instruction); playTTS(instruction, true); };

  const acceptOrder = async (order: SellerOrder) => {
    if ((window as any).currentPingAudio) {
      (window as any).currentPingAudio.pause();
    }
    setActiveOffer(null);

    await supabase.from('seller_orders').update({ status: 'accepted' }).eq('order_ref', order.order_ref);
    if (driverName) {
      let [fn, ln] = driverName.split(' ');
      let q = supabase.from('drivers').update({ current_order_ref: order.order_ref }).eq('first_name', fn);
      if (ln) q = q.eq('last_name', ln); else q = q.is('last_name', null);
      await q;
    }
    setActiveOrder(order); setPolling(false); setPendingOrders([]); setLogs([]);
    const phone = (order as any).customerPhone; if (phone) setCustomerPhone(phone);
    addLog(`Order #${order.order_ref} assigned.`); playTTS(`New order assigned. Proceed to ${order.vendor_name}.`, true);
    const realCustomerAddress = order.customerAddress || 'Customer Location';
    setActiveOrder({ ...order, storeAddress: `${order.vendor_name}`, deliveryAddress: realCustomerAddress } as any);
    setGeocoding(true); addLog('Locating pickup...');
    let custCoords: [number, number] = (order.customerLat && order.customerLng)
      ? [order.customerLat, order.customerLng]
      : (await geocodeAddress(`${realCustomerAddress}, South Africa`)) || [-33.9608, 25.6022]; // Fallback: North End PE

    // Geocode the store — Unit Cash & Carry resolves to 4 Jackson St, Korsten, Gqeberha
    const storeCoords: [number, number] =
      (await geocodeAddress(`${order.vendor_name}, South Africa`)) || UNIT_CC_GQEBERHA;
    addLog(`Store: ${order.vendor_name} @ ${storeCoords[0].toFixed(4)}, ${storeCoords[1].toFixed(4)}`);
    try {
      const driverGPS: [number, number] = mapCoords.driver || await getDriverGPS();
      addLog(`Driver: ${driverGPS[0].toFixed(4)}, ${driverGPS[1].toFixed(4)}`);
      setMapCoords({ driver: driverGPS, store: storeCoords, customer: custCoords });
      setMapKey(`trip-${order.order_ref}-${Date.now()}`);
    } catch (e) { console.error('Coord error:', e); } finally { setGeocoding(false); }
    setTripState('to_store');
  };

    // ── DEMO: Simulate a trip to Unit Cash & Carry without a real order ─────────
    const simulateTrip = async () => {
      setLogs([]);
      setPolling(false);
      // Use the position already acquired by the live GPS watch (instant, no second request)
      // Falls back to getDriverGPS() only if the watch hasn't fired yet
      const hasLive = liveGPSRef.current[0] !== GQEBERHA_DRIVER_FALLBACK[0];
      const driverStart: [number, number] = hasLive
        ? liveGPSRef.current
        : await getDriverGPS();
      addLog(`📍 Starting from: ${driverStart[0].toFixed(5)}, ${driverStart[1].toFixed(5)}`);
  
      // To ensure the route snaps perfectly to local roads, we must use real-world mapped coordinates.
      // Arbitrary offsets (+0.015) can place destinations in fields or over buildings where no road exists on the map.
      const storePos: [number, number] = UNIT_CC_GQEBERHA; // Real location of 4 Jackson Street
      // Customer is a few streets away (Korsten / North End area)
      const customerPos: [number, number] = [storePos[0] - 0.006, storePos[1] + 0.008]; 
  
      const fakeOrder: SellerOrder = {
        id: 0, order_ref: 'DEMO-001', vendor_name: 'Unit Cash & Carry',
        product_title: 'Demo Delivery', quantity: 1, customer_amount: 50,
        status: 'accepted', created_at: new Date().toISOString(),
        customerName: 'Test Customer', customerAddress: 'North End, Gqeberha',
        customerLat: customerPos[0], customerLng: customerPos[1],
      };

    setActiveOrder(fakeOrder);
    setMapCoords({ driver: driverStart, store: storePos, customer: customerPos });
    setMapKey(`demo-${Date.now()}`);
    setTripState('to_store');
    addLog('🚗 Demo trip started — heading to Unit Cash & Carry, Korsten');
    playTTS('Demo trip started. Heading to Unit Cash and Carry, Korsten, Gqeberha.', true);
  };

  const handleArrival = async (destination: string) => {
    if (destination === 'store') {
      addLog(`Arriving at ${activeOrder?.vendor_name || 'store'}`); playTTS(`Arriving at ${activeOrder?.vendor_name || 'the store'}.`, true);
      setTripState('at_store');
      setTimeout(() => { addLog('Order retrieved. En route to customer.'); playTTS('Order retrieved. En route to customer.', true); setTripState('to_customer'); }, 3000);
    } else if (destination === 'customer') {
      addLog(`Delivered!`); playTTS('You have arrived. Order delivered.', true);
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
      setTripState('delivered'); setTimeout(() => setNavInstruction(''), 5000);
      setTimeout(() => { setPolling(true); setActiveOrder(null); setTripState('idle'); }, 6000);
    }
  };

  const groupedOrders = pendingOrders.reduce<Record<string, SellerOrder[]>>((acc, o) => {
    if (!acc[o.order_ref]) acc[o.order_ref] = []; acc[o.order_ref].push(o); return acc;
  }, {});
  const topOrderRef = Object.keys(groupedOrders)[0];
  const topOrderItems = topOrderRef ? groupedOrders[topOrderRef] : [];
  const topOrderTotal = topOrderItems.reduce((s, o) => s + o.customer_amount, 0);

  if (authLoading || !driverName) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>Checking session...</div>;
  }

  return (
    <>
      <div className={styles.appShell}>
        {/* === MOBILE-FIRST VIEW === */}
        {isMobile ? (
          <>
            {/* === UBER FULL-SCREEN OFFER POPUP === */}
            {activeOffer && (
              <div className={styles.offerOverlay}>
                <div className={styles.offerMapBlur}></div>
                
                <div className={styles.offerHeader}>
                  <div className={styles.offerTimeBox}>
                     <svg viewBox="0 0 36 36" className={styles.circularChart}>
                       <path className={styles.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                       <path className={styles.circle} strokeDasharray={`${(offerCountdown/15)*100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     </svg>
                     <div className={styles.offerSeconds}>{offerCountdown}</div>
                  </div>
                </div>
                
                <div className={styles.offerCardMobile}>
                  <div className={styles.offerType}>Delivery</div>
                  <div className={styles.offerPrice}>R{activeOffer.reduce((s,o)=>s+o.customer_amount,0).toFixed(2)}</div>
                  <div className={styles.offerMetrics}>
                    <span>{(activeOffer[0] as any)?.distance?.toFixed(1) || '2.4'} km</span>
                    <span>•</span>
                    <span>{activeOffer.length} item{activeOffer.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className={styles.offerLocations}>
                    <div className={styles.offerLocRow}>
                       <div className={styles.offerDotStore}></div>
                       <div className={styles.offerLocText}>{activeOffer[0].vendor_name}</div>
                    </div>
                    <div className={styles.offerLocLine}></div>
                    <div className={styles.offerLocRow}>
                       <div className={styles.offerDotCust}></div>
                       <div className={styles.offerLocText}>{activeOffer[0].customerAddress || 'Customer Location'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button className={styles.offerDeclineBtn} onClick={() => {
                       if ((window as any).currentPingAudio) (window as any).currentPingAudio.pause();
                       setSkippedOrders(s => new Set(s).add(activeOffer[0].order_ref));
                       setActiveOffer(null);
                    }}>X</button>
                    <button className={styles.offerAcceptBtn} onClick={() => acceptOrder(activeOffer[0])}>Tap to Accept</button>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.mobileMapWrap}>
              <DispatchMap 
                key={mapKey} 
                tripState={tripState} 
                storeCoords={mapCoords.store} 
                customerCoords={mapCoords.customer} 
                driverCoords={mapCoords.driver} 
                storeName={activeOrder?.vendor_name || 'Unity C&C'} 
                onArrival={handleArrival} 
                onTurn={handleTurn}
                onUpdate={setNavTelemetry}
              />
            </div>

            <button className={styles.mobileMenuBtn} onClick={() => setDrawerOpen(true)}>☰</button>

            <div className={styles.mobileStatusPill}>
              <div className={styles.mobilePillDot} />
              <span className={styles.mobilePillText}>{polling ? 'Online' : 'On Trip'}</span>
            </div>

            {(tripState === 'to_store' || tripState === 'to_customer' || tripState === 'at_store') && navInstruction && (
              <div className={styles.mobileNavBanner}>
                <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className={styles.mobileNavText}>{navInstruction}</div>
              </div>
            )}

            {/* === GOOGLE NAVIGATION BOTTOM BAR === */}
            {(tripState === 'to_store' || tripState === 'to_customer') && (
              <div className={styles.mobileNavFooter}>
                <div className={styles.navFooterLeft}>
                  <div className={styles.navEtaMain}>
                    <span className={styles.navEtaTime}>{Math.ceil(navTelemetry.timeRem / 60)} min</span>
                    <span className={styles.navEtaArrival}>
                      {new Date(Date.now() + navTelemetry.timeRem * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.navEtaDist}>{(navTelemetry.distanceRem / 1000).toFixed(1)} km</div>
                </div>
                <div className={styles.navFooterRight}>
                  <button className={styles.navArriveBtn} onClick={() => {
                    handleArrival(tripState === 'to_store' ? 'store' : 'customer');
                  }}>ARRIVE</button>
                  <button className={styles.navExitBtn} onClick={() => {
                    setTripState('idle');
                    setActiveOrder(null);
                    setPolling(true);
                  }}>EXIT</button>
                </div>
              </div>
            )}

            {tripState !== 'to_store' && tripState !== 'to_customer' && (
              <div 
                className={`${styles.mobileBottomSheet} ${sheetMinimized ? styles.minimized : ''}`}
              onTouchStart={e => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientY); }}
              onTouchMove={e => setTouchEnd(e.targetTouches[0].clientY)}
              onTouchEnd={() => {
                if (!touchStart || !touchEnd) return;
                if (touchStart - touchEnd < -40) setSheetMinimized(true);  // Swiped down
                if (touchStart - touchEnd > 40) setSheetMinimized(false); // Swiped up
              }}
            >
              {/* Entire header area is now clickable, massive tap target for drivers */}
              <div 
                className={styles.mobileSheetHandleWrap} 
                onClick={() => setSheetMinimized(!sheetMinimized)}
                style={{ minHeight: '40px', width: '100%' }}
              >
                <div className={styles.mobileSheetHandle} />
              </div>
              <div className={styles.mobileSheetScroll}>
                {(tripState === 'idle' || tripState === 'delivered') && (
                  topOrderRef ? (
                    <div className={styles.mobileWaitCard}>
                      <div className={styles.mobileWaitPulseBar} />
                      <div className={styles.mobileWaitHeader}>
                        <span className={styles.mobileWaitTitle}>NEW ORDER</span>
                        <span className={styles.mobileWaitLive}>Live</span>
                      </div>
                      <div className={styles.mobileWaitAmount}>R{topOrderTotal.toFixed(2)}</div>
                      <div className={styles.mobileWaitMeta}>{topOrderItems.length} items · {(topOrderItems[0] as any)?.distance?.toFixed(1) || '2.4'} km · ~{Math.round(((topOrderItems[0] as any)?.distance || 2.4) * 3)} mins</div>
                      
                      <div className={styles.mobileItemsList}>
                        {topOrderItems.slice(0, 2).map((item, i) => (
                          <div key={i} className={styles.mobileItemRow}>
                            <span>{item.quantity}× {item.product_title}</span>
                            <span style={{ fontWeight: 700 }}>R{item.customer_amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className={styles.mobileAddresses}>
                        <div className={styles.mobileAddrRow}>
                          <div className={styles.mobileAddrTitle}>Pickup</div>
                          <div className={styles.mobileAddrSub}>{topOrderItems[0]?.vendor_name || 'Unity C&C'}</div>
                        </div>
                        <div className={`${styles.mobileAddrRow} ${styles.mobileDrop}`}>
                          <div className={styles.mobileAddrTitle}>Dropoff</div>
                          <div className={styles.mobileAddrSub}>{topOrderItems[0]?.customerAddress || 'Customer Location'}</div>
                        </div>
                      </div>

                      <button className={styles.mobileAcceptBtn} onClick={() => acceptOrder(topOrderItems[0])}>Accept Delivery</button>
                    </div>
                  ) : (
                    <div className={styles.mobileScanWait}>
                      <div className={styles.mobileScanEmoji}>📡</div>
                      <div className={styles.mobileScanText}>Waiting for a customer<br/>to place an order</div>
                      <button
                        onClick={simulateTrip}
                        style={{
                          marginTop: 20, padding: '14px 24px',
                          background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
                          border: 'none', borderRadius: 12, color: '#fff',
                          fontWeight: 700, fontSize: 15, cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(26,115,232,0.4)',
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', justifyContent: 'center',
                        }}
                      >
                        🚗 Test Drive to Unit C&amp;C
                      </button>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' }}>
                        Simulates: Sydenham → Unit Cash &amp; Carry, Korsten
                      </div>
                    </div>
                  )
                )}

                {tripState !== 'idle' && tripState !== 'delivered' && activeOrder && (
                  <>
                    <div className={styles.mobileTripCard}>
                      <div className={styles.mobileTripTop}>
                        <span className={styles.mobileOrderRef}>#{activeOrder.order_ref}</span>
                        <span className={styles.mobileBadge}>
                          {tripState === 'to_store' ? 'To Store' : tripState === 'at_store' ? 'At Store' : 'To Customer'}
                        </span>
                      </div>
                      <div className={styles.mobileAddresses} style={{ marginBottom: 0 }}>
                        <div className={styles.mobileAddrRow}>
                          <div className={styles.mobileAddrTitle}>{activeOrder.vendor_name}</div>
                        </div>
                        <div className={`${styles.mobileAddrRow} ${styles.mobileDrop}`}>
                          <div className={styles.mobileAddrTitle}>{(activeOrder as any).customerName || 'Customer'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <button className={styles.mobileChatBtn} style={{ marginTop: 0 }} onClick={() => setShowChat(true)}>
                          💬 Chat {unreadCount > 0 && <span style={{ background: '#ff3b30', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{unreadCount}</span>}
                        </button>
                        <button className={styles.mobileChatBtn} style={{ marginTop: 0, background: '#0f9d58', flex: '0 0 auto', padding: '14px 20px', width: 'auto' }} onClick={initiateCall}>
                          📞
                        </button>
                      </div>
                    </div>
                    <div className={styles.mobileLogBox}>
                      {logs.map((log, i) => (
                        <div key={i} className={styles.mobileLogEntry}>
                          <span className={styles.mobileLogTime}>{log.time}</span>
                          <span>{log.text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              </div>
            )}

            {tripState !== 'to_store' && tripState !== 'to_customer' && (
              <div className={styles.mobileTabBar}>
              <button className={styles.mobileTabItem} onClick={() => setActiveTab('map')}>
                <div className={`${styles.mobileTabIcon} ${activeTab==='map'?styles.mobileActive:''}`}>🧭</div>
                <div className={`${styles.mobileTabLabel} ${activeTab==='map'?styles.mobileActive:''}`}>Map</div>
              </button>
              <button className={styles.mobileTabItem} onClick={() => setActiveTab('earnings')}>
                <div className={`${styles.mobileTabIcon} ${activeTab==='earnings'?styles.mobileActive:''}`}>💰</div>
                <div className={`${styles.mobileTabLabel} ${activeTab==='earnings'?styles.mobileActive:''}`}>Earnings</div>
              </button>
              <button className={styles.mobileTabItem}>
                <div className={styles.mobileTabIcon}>📋</div>
                <div className={styles.mobileTabLabel}>Account</div>
              </button>
            </div>
            )}

            {drawerOpen && (
              <div className={styles.drawerOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}>
                <div className={styles.drawer}>
                  <div className={styles.drawerHead}>
                    <div className={styles.drawerAvatar}>{driverName.charAt(0)}</div>
                    <div className={styles.drawerName}>{driverName}</div>
                    <div className={styles.drawerStatus}>● Active Driver</div>
                  </div>
                  <div className={styles.drawerMenu}>
                    <div className={styles.drawerItem} onClick={() => { setActiveTab('map'); setDrawerOpen(false); }}>🧭 Home</div>
                    <div className={styles.drawerItem} onClick={() => { setActiveTab('earnings'); setDrawerOpen(false); }}>💰 Earnings</div>
                    <div className={styles.drawerItem}>📋 Settings</div>
                  </div>
                  <div className={styles.drawerFooter}>
                    <button className={styles.signOutBtn} onClick={async () => { import('./login/actions').then(m => m.driverLogout().then(() => window.location.href = '/login')); }}>Sign Out</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* === DESKTOP VIEW === */
          <div className={styles.dashboardLayout}>
            <aside className={styles.sidebar}>
              <div className={styles.brandNav}>
                <div className={styles.brandTitle}>DailyMarket <span style={{ color: '#05A357' }}>●</span></div>
                <div className={styles.brandSubtitle}>Delivery Operations Hub</div>
              </div>
              <div className={styles.sidebarMenu}>
                <div className={`${styles.menuItem} ${activeTab === 'map' ? styles.active : ''}`} onClick={() => setActiveTab('map')}>Live Dispatch Map</div>
                <div className={`${styles.menuItem} ${activeTab === 'earnings' ? styles.active : ''}`} onClick={() => setActiveTab('earnings')}>Earnings &amp; Payouts</div>
                <div className={styles.menuItem}>Trips &amp; Schedules</div>
                <div className={styles.menuItem}>Fleet Directory</div>
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid #E2E2E2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{driverName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{driverName}</div>
                    <div style={{ color: '#05A357', fontSize: 12, fontWeight: 600 }}>● Active Driver</div>
                  </div>
                </div>
                <button onClick={async () => { import('./login/actions').then(m => m.driverLogout().then(() => window.location.href = '/login')); }} style={{ width: '100%', background: '#F6F6F6', border: '1px solid #E2E2E2', borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#545454' }}>Sign Out</button>
              </div>
            </aside>
            <main className={styles.mainArea}>
              <header className={styles.topHeader}>
                <div className={styles.headerTitle}>{activeTab === 'map' ? 'Active Movement' : 'Driver Earnings'}</div>
                <div className={styles.headerActions}>
                  {activeTab === 'map' && (
                    tripState === 'idle' || tripState === 'delivered' ? (
                      <button className={styles.actionBtnBlack} style={{ backgroundColor: '#05A357', color: 'white' }}>{polling ? '● Online: Watching for Orders' : '● Offline'}</button>
                    ) : (
                      <button className={styles.actionBtnGrey}>Tracking Request...</button>
                    )
                  )}
                </div>
              </header>
              {activeTab === 'map' ? (
                <div className={styles.contentSplit}>
                  <div className={styles.mapSection}>
                    {(tripState === 'to_store' || tripState === 'to_customer' || tripState === 'at_store') && navInstruction && (
                      <div className={styles.navOverlay}>
                        <div className={styles.navIconContainer}><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                        <div className={styles.navText}><div className={styles.navInstruction}>{navInstruction}</div></div>
                      </div>
                    )}
                    {(tripState === 'to_store' || tripState === 'to_customer') && (
                      <div className={styles.navBottom}>
                        <div>
                          <div className={styles.etaText}>{tripState === 'to_store' ? '~5 min' : '~10 min'}</div>
                          <div className={styles.etaSub}>{tripState === 'to_store' ? 'en route to store' : 'en route to customer'}</div>
                        </div>
                        <button className={styles.navExit} onClick={() => { setTripState('idle'); setNavInstruction(''); setPolling(true); setActiveOrder(null); }}>Exit</button>
                      </div>
                    )}
                    <div className={styles.mapOverlay} style={{ pointerEvents: 'none', zIndex: 1000, position: 'relative', display: tripState === 'idle' ? 'block' : 'none' }}>
                      <div className={styles.statusPill} style={{ pointerEvents: 'auto' }}>
                        <div className={styles.liveIndicator}></div>
                        <span className={styles.statusText}>{pendingOrders.length > 0 ? `${Object.keys(groupedOrders).length} Pending Order(s)` : '9 Online Drivers'}</span>
                        <span style={{ color: '#545454' }}>•</span>
                        <span className={styles.statusText}>4 Active Deliveries</span>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                      <DispatchMap key={mapKey} tripState={tripState} storeCoords={mapCoords.store} customerCoords={mapCoords.customer} driverCoords={mapCoords.driver} storeName={activeOrder?.vendor_name || 'Unity C&C'} onArrival={handleArrival} onTurn={handleTurn} />
                    </div>
                  </div>
                  <div className={styles.sidePanel}>
                    <div className={styles.panelSection}>
                      <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Trip Details</h2>
                        {tripState !== 'idle' && tripState !== 'delivered' && <span className={styles.liveIndicator}></span>}
                      </div>
                      {(tripState === 'idle' || tripState === 'delivered') && (
                        topOrderRef ? (
                          <div className={styles.radarCard}>
                            <div className={styles.radarPulse}></div>
                            <div className={styles.radarHeader}>
                              <span className={styles.radarTitle}>🛒 New Order #{topOrderRef}</span>
                              <span className={styles.radarTime}>Just now</span>
                            </div>
                            <div className={styles.radarOfferPrice}>R{topOrderTotal.toFixed(2)}</div>
                            <div className={styles.radarOfferDist}>{topOrderItems.length} item{topOrderItems.length > 1 ? 's' : ''} · {(topOrderItems[0] as any)?.distance?.toFixed(1) || '2.4'} km · ~{Math.round(((topOrderItems[0] as any)?.distance || 2.4) * 3)} mins</div>
                            <div style={{ margin: '12px 0', borderRadius: 8, background: '#f8f8f8', padding: '8px 12px', color: '#111' }}>
                              {topOrderItems.slice(0, 3).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: i < topOrderItems.length - 1 ? '1px solid #eee' : 'none' }}>
                                  <span>{item.quantity}× {item.product_title}</span>
                                  <span style={{ fontWeight: 700 }}>R{item.customer_amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className={styles.activityAddresses} style={{ marginTop: 8, marginBottom: 16 }}>
                              <div className={styles.addressRow}>
                                <div className={styles.addressTitle}>Pickup: {topOrderItems[0]?.vendor_name || 'Unity C&C'}</div>
                                <div className={styles.addressSub}>{topOrderItems[0]?.vendor_name ? 'Pickup Location' : 'Store Location'}</div>
                              </div>
                              <div className={`${styles.addressRow} ${styles.dropoff}`}>
                                <div className={styles.addressTitle}>Dropoff: {topOrderItems[0]?.customerName || 'Customer'}</div>
                                <div className={styles.addressSub}>{topOrderItems[0]?.customerAddress || 'Customer Location'}</div>
                              </div>
                            </div>
                            <button className={styles.acceptBtn} onClick={() => acceptOrder(topOrderItems[0])}>✓ Accept Delivery — R{topOrderTotal.toFixed(2)}</button>
                          </div>
                        ) : (
                          <div className={styles.radarCard}>
                            <div className={styles.radarPulse}></div>
                            <div className={styles.radarHeader}>
                              <span className={styles.radarTitle}>Scanning for orders...</span>
                              <span className={styles.radarTime}>Live</span>
                            </div>
                            <div style={{ textAlign: 'center', padding: '16px 0 8px', color: '#888', fontSize: 14 }}>
                              <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
                              Waiting for a customer to place an order
                            </div>
                            {/* ── Demo simulation button ── */}
                            <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginTop: 8 }}>
                              <button
                                onClick={simulateTrip}
                                style={{
                                  width: '100%', padding: '13px 0',
                                  background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
                                  border: 'none', borderRadius: 10, color: '#fff',
                                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                  boxShadow: '0 4px 16px rgba(26,115,232,0.35)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                              >
                                🚗 Test Drive to Unit C&amp;C
                              </button>
                              <div style={{ fontSize: 11, color: '#aaa', marginTop: 6, textAlign: 'center' }}>
                                Sydenham → Unit Cash &amp; Carry, Korsten, Gqeberha
                              </div>
                            </div>
                          </div>
                        )
                      )}
                      {tripState !== 'idle' && tripState !== 'delivered' && activeOrder && (
                        <div className={styles.activityCard}>
                          <div className={styles.activityTop}>
                            <span className={styles.orderRef}>Order #{activeOrder.order_ref}</span>
                            <span className={`${styles.uberBadge} ${styles.dark}`}>
                              {tripState === 'to_store' ? 'En Route to Store' : tripState === 'at_store' ? 'At Store' : 'On Way to Customer'}
                            </span>
                          </div>
                          <div className={styles.activityAddresses}>
                            <div className={styles.addressRow}>
                              <div className={styles.addressTitle}>Pickup: {activeOrder.vendor_name}</div>
                              <div className={styles.addressSub}>Pickup Location</div>
                            </div>
                            <div className={`${styles.addressRow} ${styles.dropoff}`}>
                              <div className={styles.addressTitle}>Dropoff: {(activeOrder as any).customerName || 'Customer'}</div>
                              <div className={styles.addressSub}>{(activeOrder as any).deliveryAddress || 'Customer Location'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <button onClick={() => setShowChat(true)} style={{ width: '100%', padding: '10px 0', background: '#25D366', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' }}>
                              💬 Chat with Customer
                              {unreadCount > 0 && <span style={{ background: '#ff3b30', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{unreadCount}</span>}
                            </button>
                            <button onClick={initiateCall} style={{ padding: '10px 20px', background: '#0f9d58', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>
                              📞
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>Live Feed log:</div>
                        <div className={styles.logBox}>
                          {logs.map((log, i) => (
                            <div key={i} className={styles.logEntry}>
                              <span suppressHydrationWarning className={styles.logTime}>{log.time}</span>
                              <span>{log.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.earningsDashboard}>
                  <div className={styles.earningsGrid}>
                    <div className={styles.earningsCol}>
                      <div className={styles.balanceCard}>
                        <div className={styles.balanceTitle}>Available to pay out</div>
                        <div className={styles.balanceAmount}>R3,450.00</div>
                        <div className={styles.balanceActions}><button className={`${styles.payoutBtn} ${!hasBank ? styles.disabled : ''}`} onClick={() => alert('Transferring funds via Stripe!')}>Cash out now</button></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* WhatsApp Chat Overlay */}
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

      {/* Call Overlay */}
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
    </>
  );
}
