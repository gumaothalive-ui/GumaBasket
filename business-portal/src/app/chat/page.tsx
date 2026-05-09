'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const CHAT_BG = '#E5DDD5';

type ChatMessage = {
  id: string;
  order_ref: string;
  sender: 'customer' | 'driver';
  text: string;
  created_at: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function DriverChatPage() {
  const [orderRef, setOrderRef] = useState('');
  const [inputRef, setInputRef] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeOrders, setActiveOrders] = useState<{ order_ref: string; status: string }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load active accepted orders so driver can pick which chat to open
  useEffect(() => {
    supabase
      .from('seller_orders')
      .select('order_ref, status')
      .in('status', ['accepted', 'preparing', 'ready'])
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setActiveOrders(data);
      });
  }, []);

  const loadMessages = useCallback(async (ref: string) => {
    const { data } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_ref', ref)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  }, []);

  const subscribeToChat = useCallback((ref: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`order_chat:${ref}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_ref=eq.${ref}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  useEffect(() => {
    if (orderRef) {
      loadMessages(orderRef);
      subscribeToChat(orderRef);
    }
  }, [orderRef, loadMessages, subscribeToChat]);

  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages]);

  const openChat = (ref: string) => {
    setOrderRef(ref);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!chatInput.trim() || !orderRef || isSending) return;
    setIsSending(true);
    const text = chatInput.trim();
    setChatInput('');

    const { error } = await supabase.from('order_messages').insert({
      order_ref: orderRef,
      sender: 'driver',
      text,
    });

    if (error) {
      console.error('Send failed:', error.message);
      setChatInput(text);
    }
    setIsSending(false);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f0f0f0' }}>

      {/* ── Order Selector ── */}
      {!orderRef && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#111', marginBottom: 8 }}>Driver Chat</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Select an active order to open its chat channel.</p>

          {/* Manual entry */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input
              value={inputRef}
              onChange={e => setInputRef(e.target.value.toUpperCase())}
              placeholder="Order ref e.g. A1B2C3D4"
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: '0.95rem', outline: 'none' }}
            />
            <button
              onClick={() => { if (inputRef.trim()) openChat(inputRef.trim()); }}
              style={{ background: '#075E54', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
            >
              Open
            </button>
          </div>

          {/* Active order tiles */}
          {activeOrders.length > 0 && (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>ACTIVE ORDERS</div>
              {activeOrders.map(o => (
                <button
                  key={o.order_ref}
                  onClick={() => openChat(o.order_ref)}
                  style={{
                    width: '100%', textAlign: 'left', background: '#fff',
                    border: '1px solid #e5e7eb', borderRadius: 14,
                    padding: '14px 16px', marginBottom: 10,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ width: 44, height: 44, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🧑‍🤝‍🧑</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>Order DM-{o.order_ref}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: 2, textTransform: 'capitalize' }}>{o.status}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: '#075E54', fontWeight: 700, fontSize: '0.85rem' }}>Chat →</div>
                </button>
              ))}
            </>
          )}

          {activeOrders.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: '0.9rem' }}>
              No active orders right now.
            </div>
          )}
        </div>
      )}

      {/* ── Chat View ── */}
      {orderRef && (
        <>
          {/* Header */}
          <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 }}>
            <button onClick={() => { setOrderRef(''); setMessages([]); if (channelRef.current) supabase.removeChannel(channelRef.current); }}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer', padding: '4px 8px 4px 0', lineHeight: 1 }}>
              ←
            </button>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🧑‍🤝‍🧑</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Customer · DM-{orderRef}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>
                {connected ? '🟢 Live · real-time' : '⏳ Connecting...'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', background: CHAT_BG }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: 12, fontSize: '0.72rem', color: '#555', fontWeight: 600 }}>TODAY</span>
            </div>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginTop: 32 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📦</div>
                No messages yet. The customer will message you here.
              </div>
            )}

            {messages.map((msg) => {
              const isMine = msg.sender === 'driver';
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                  <div style={{
                    maxWidth: '78%', padding: '8px 12px 6px',
                    background: isMine ? '#DCF8C6' : '#ffffff',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  }}>
                    {!isMine && (
                      <div style={{ fontSize: '0.7rem', color: '#e67e22', fontWeight: 700, marginBottom: 2 }}>Customer</div>
                    )}
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#111', lineHeight: 1.45 }}>{msg.text}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: '0.65rem', color: '#8696a0' }}>{formatTime(msg.created_at)}</span>
                      {isMine && <span style={{ fontSize: '0.7rem', color: '#53bdeb' }}>✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{
            background: '#f0f0f0', padding: '8px 12px',
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, minHeight: 64
          }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 24, padding: '10px 16px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Message customer..."
                style={{ border: 'none', outline: 'none', fontSize: '0.95rem', width: '100%', background: 'transparent', fontFamily: 'inherit' }}
              />
            </div>
            <button
              disabled={!chatInput.trim() || isSending}
              onClick={handleSend}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: chatInput.trim() ? '#075E54' : '#b0bec5',
                color: '#fff', fontSize: '1.1rem',
                cursor: chatInput.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s'
              }}
            >
              {isSending ? '⏳' : '➤'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
