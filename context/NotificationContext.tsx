'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { etholWs } from '../lib/websocket';
import { useAuth } from './AuthContext';
import * as etholApi from '../lib/ethol-api';
import type { WSConnectionState } from '../lib/websocket';

export interface Notification {
  id: string;
  judul: string;
  pesan: string;
  tipe: string;
  status: string;
  created_at: string;
  link_target?: string;
  mahasiswa_id?: string;
  alert_id?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'created_at'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  wsConnected: boolean;
  wsConnectionState: WSConnectionState;
  lastEvent: { type: string; time: Date } | null;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  wsConnected: false,
  wsConnectionState: 'disconnected',
  lastEvent: null,
});

export const useNotifications = () => useContext(NotificationContext);

const WS_EVENT_TYPES: Record<string, { judul: string; tipe: string; link: string; emoji: string }> = {
  PRESENSI: { judul: 'Presensi Baru', tipe: 'alert', link: '/mahasiswa/kehadiran', emoji: '📋' },
  TUGAS: { judul: 'Tugas Baru', tipe: 'info', link: '/mahasiswa/tugas-online', emoji: '📝' },
  MATERI: { judul: 'Materi Baru', tipe: 'info', link: '/mahasiswa/materi-perkuliahan', emoji: '📚' },
  PENGUMUMAN: { judul: 'Pengumuman Baru', tipe: 'info', link: '/mahasiswa/beranda', emoji: '📢' },
  NILAI: { judul: 'Nilai Diperbarui', tipe: 'alert', link: '/mahasiswa/nilai', emoji: '📊' },
  ALERT: { judul: 'Alert Akademik', tipe: 'alert', link: '/mahasiswa/kehadiran', emoji: '⚠️' },
  CHAT: { judul: 'Pesan Baru', tipe: 'jadwal', link: '#', emoji: '💬' },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsConnectionState, setWsConnectionState] = useState<WSConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<{ type: string; time: Date } | null>(null);
  const unsubRef = useRef<(() => void)[]>([]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load existing & subscribe to new notifications
  useEffect(() => {
    if (!user) return;

    const loadInitial = async () => {
      const { data } = await supabase
        .from('notifikasi')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n) => n.status === 'belum_dibaca').length);
      }
    };
    loadInitial();

    const channel = supabase
      .channel('notifikasi-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifikasi',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications((prev) => [newNotif, ...prev]);
        if (newNotif.status === 'belum_dibaca') {
          setUnreadCount((prev) => prev + 1);
          showBrowserNotification(newNotif.judul, newNotif.pesan);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // WebSocket connection management
  useEffect(() => {
    if (!user) return;

    // Try to connect with ETHOL JWT token
    const connectWithToken = async () => {
      const { data: session } = await supabase
        .from('user_ethol_sessions')
        .select('ethol_cookie')
        .eq('user_id', user.id)
        .maybeSingle();

      if (session?.ethol_cookie) {
        const jwt = await etholApi.getEtholJwtToken(session.ethol_cookie);
        if (jwt) {
          etholWs.connect(jwt);
          return;
        }
      }
      // Fallback: connect without token (may work for public channels)
      etholWs.connect();
    };

    connectWithToken();

    const unsubState = etholWs.onConnectionStateChange(setWsConnectionState);

    // Register handlers for all ETHOL event types
    const handlers: (() => void)[] = [];
    for (const [eventType, meta] of Object.entries(WS_EVENT_TYPES)) {
      const unsub = etholWs.on(eventType, (data: any) => {
        setLastEvent({ type: eventType, time: new Date() });
        const notif: Omit<Notification, 'id' | 'created_at'> = {
          judul: meta.judul,
          pesan: data.pesan || `${meta.emoji} ${meta.judul}`,
          tipe: meta.tipe,
          status: 'belum_dibaca',
          link_target: data.urlWeb || meta.link,
        };
        addNotificationToDB(notif);
      });
      handlers.push(unsub);
    }

    const unsubConnected = etholWs.on('_connected', () => {
      console.log('[Notif] WS Connected');
    });

    unsubRef.current = [unsubState, unsubConnected, ...handlers];

    return () => {
      for (const unsub of unsubRef.current) unsub();
      etholWs.disconnect();
    };
  }, [user]);

  const addNotificationToDB = async (notif: Omit<Notification, 'id' | 'created_at'>) => {
    if (!user) return;
    const { data } = await supabase
      .from('notifikasi')
      .insert({ user_id: user.id, ...notif })
      .select()
      .single();
    if (data) {
      setNotifications((prev) => [data as Notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  };

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'created_at'>) => {
    addNotificationToDB(n);
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifikasi')
      .update({ status: 'sudah_dibaca', dibaca_at: new Date().toISOString() })
      .eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'sudah_dibaca' } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifikasi')
      .update({ status: 'sudah_dibaca', dibaca_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'belum_dibaca');
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: 'sudah_dibaca' }))
    );
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        wsConnected: wsConnectionState === 'connected',
        wsConnectionState,
        lastEvent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.png' });
  }
}
