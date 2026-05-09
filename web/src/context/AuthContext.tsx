'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 SAFETY GUARD: Don't attempt to call Supabase Auth if credentials are missing
    if (!isSupabaseReady) {
      console.log('[AuthContext] Supabase credentials missing/placeholder. Auth skipped.');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('[AuthContext] Session fetch error (could be an invalid refresh token). Clearing session.', error.message);
        // We can ignore the error, just means user isn't logged in correctly anymore
        if (typeof window !== 'undefined') {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {}
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.warn('[AuthContext] Unhandled session fetch exception:', err);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('GUMA BASKET_cart');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (isSupabaseReady) {
      await supabase.auth.signOut();
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('GUMA BASKET_cart');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
