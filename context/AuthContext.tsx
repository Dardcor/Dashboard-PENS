'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { PublicUser, UserRole } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: PublicUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  setLocalSession: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: async () => {},
  setLocalSession: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localSess = typeof window !== 'undefined' ? localStorage.getItem('pens_local_session') : null;
    let localUserId: string | null = null;
    
    if (localSess) {
      try {
        const u = JSON.parse(localSess);
        if (u && u.id) {
          localUserId = u.id;
          setUser(u);
          setRole(u.role);
          setSession({ user: { id: u.id, email: u.email } } as unknown as Session);
        }
      } catch (e) {
        console.error(e);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        fetchUserProfile(session.user.id);
      } else if (localUserId) {
        // Verifikasi local session ke database
        fetchUserProfile(localUserId);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        fetchUserProfile(session.user.id);
      } else if (!localStorage.getItem('pens_local_session')) {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) throw error || new Error("User not found");

      setUser(data as PublicUser);
      setRole(data.role as UserRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pens_local_session', JSON.stringify(data));
      }
    } catch (error) {
      console.error("Verifikasi gagal (User tidak ditemukan):", error);
      // Hapus sesi lokal dan sign out karena DB kosong atau user dihapus
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pens_local_session');
      }
      setUser(null);
      setRole(null);
      setSession(null);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const setLocalSession = (u: PublicUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pens_local_session', JSON.stringify(u));
    }
    setUser(u);
    setRole(u.role);
    setSession({ user: { id: u.id, email: u.email } } as unknown as Session);
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pens_local_session');
    }
    setUser(null);
    setRole(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    session,
    user,
    role,
    loading,
    login,
    logout,
    setLocalSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
