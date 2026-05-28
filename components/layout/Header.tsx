'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Menu, CheckCheck, Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtime } from '../../context/RealtimeContext';
import type { WSConnectionState } from '../../lib/websocket';

function ConnectionIndicator({ state }: { state: WSConnectionState }) {
  const colors: Record<WSConnectionState, string> = {
    connected: '#10b981',
    connecting: '#f59e0b',
    reconnecting: '#f59e0b',
    disconnected: '#ef4444',
  };

  const labels: Record<WSConnectionState, string> = {
    connected: 'Live',
    connecting: 'Menghubungkan...',
    reconnecting: 'Menyambung ulang...',
    disconnected: 'Offline',
  };

  const isActive = state === 'connected';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem',
        cursor: 'pointer',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        backgroundColor: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${colors[state]}40`,
      }}
      title={`Real-time: ${labels[state]}`}
    >
      {isActive ? (
        <span style={{ position: 'relative', display: 'flex' }}>
          <Wifi size={11} style={{ color: colors[state] }} />
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 6, height: 6,
            borderRadius: '50%', backgroundColor: colors[state],
            animation: 'pulse 2s infinite',
          }} />
        </span>
      ) : state === 'connecting' || state === 'reconnecting' ? (
        <RefreshCw size={11} style={{ color: colors[state], animation: 'spin 1s linear infinite' }} />
      ) : (
        <WifiOff size={11} style={{ color: colors[state] }} />
      )}
      <span style={{ color: colors[state], fontWeight: 600 }}>{labels[state]}</span>
    </div>
  );
}

export default function Header() {
  const { toggle, isMobile } = useSidebar();
  const { notifications, unreadCount, markAsRead, markAllAsRead, wsConnectionState, lastEvent } = useNotifications();
  const { alertBaru, wsEventLog } = useRealtime();
  const [showNotif, setShowNotif] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) {
        setShowActivity(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getTipeIcon = (tipe: string) => {
    const colors: Record<string, string> = {
      alert: '#ef4444',
      pengingat: '#f59e0b',
      info: '#3b82f6',
      jadwal: '#10b981',
    };
    return colors[tipe] || '#6b7280';
  };

  const totalActiveAlerts = alertBaru.length;

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 50,
        width: '100%',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isMobile && (
          <button
            onClick={toggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: '0.25rem' }}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Logo PENS" style={{ height: '36px', width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', color: 'white' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.25rem', lineHeight: 1.2, letterSpacing: '0.5px' }}>ETHOL</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.9, letterSpacing: '0.2px' }}>Enterprise Technology Hybrid Online Learning</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            aria-label="Notifikasi"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--color-primary)',
                  animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxHeight: '480px',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                  Notifikasi
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      ({unreadCount} belum dibaca)
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <CheckCheck size={14} /> Tandai Semua Dibaca
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    <Bell size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Tidak ada notifikasi</p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.status === 'belum_dibaca') markAsRead(n.id);
                        setShowNotif(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: n.status === 'belum_dibaca' ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.status === 'belum_dibaca' ? 'rgba(59, 130, 246, 0.03)' : 'transparent')}
                    >
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: getTipeIcon(n.tipe),
                        marginTop: '6px', flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: n.status === 'belum_dibaca' ? 700 : 500, fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
                          {n.judul}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.pesan}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                          {new Date(n.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
