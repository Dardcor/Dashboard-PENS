'use client';

import { useNotifications } from '../../../../context/NotificationContext';
import { Bell, CheckCheck, Loader2, AlertTriangle, Info, Calendar } from 'lucide-react';

export default function MahasiswaNotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, wsConnected } = useNotifications();

  const getIcon = (tipe: string) => {
    switch (tipe) {
      case 'alert': return <AlertTriangle size={18} style={{ color: '#ef4444' }} />;
      case 'pengingat': return <Calendar size={18} style={{ color: '#f59e0b' }} />;
      case 'info': return <Info size={18} style={{ color: '#3b82f6' }} />;
      default: return <Bell size={18} style={{ color: '#6b7280' }} />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Notifikasi
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            {wsConnected ? 'Terhubung secara real-time' : 'Notifikasi dari sistem'}
            {unreadCount > 0 && ` - ${unreadCount} belum dibaca`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <CheckCheck size={16} /> Tandai Semua Dibaca
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {notifications.length === 0 ? (
          <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--color-text-secondary)' }}>Belum ada notifikasi</h3>
            <p className="text-muted">Notifikasi akan muncul ketika ada aktivitas baru di ETHOL.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (n.status === 'belum_dibaca') markAsRead(n.id); }}
              className="card p-4"
              style={{
                cursor: 'pointer',
                borderLeft: `4px solid ${n.status === 'belum_dibaca' ? '#3b82f6' : 'transparent'}`,
                backgroundColor: n.status === 'belum_dibaca' ? 'rgba(59,130,246,0.02)' : 'transparent',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '2px' }}>{getIcon(n.tipe)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: n.status === 'belum_dibaca' ? 700 : 500, color: 'var(--color-text-primary)', margin: 0 }}>
                      {n.judul}
                    </h4>
                    {n.status === 'belum_dibaca' && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0', lineHeight: 1.4 }}>
                    {n.pesan}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {new Date(n.created_at).toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
