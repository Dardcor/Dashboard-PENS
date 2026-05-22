'use client';

import Image from 'next/image';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user, role } = useAuth();

  const avatarUrl =
    user?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? 'User')}&background=random`;

  return (
    <header
      className="glass"
      style={{
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 9,
        borderBottom: '1px solid var(--color-border)',
        marginLeft: '260px',
      }}
    >
      {/* Search bar */}
      <div style={{ flex: 1 }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Cari mahasiswa, NRP..."
            className="form-control"
            style={{
              paddingLeft: '2.5rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-background)',
              border: 'none',
            }}
          />
        </div>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Notification bell */}
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            color: 'var(--color-text-secondary)',
          }}
          aria-label="Notifikasi"
        >
          <Bell size={20} />
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: 'var(--color-danger)',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
            }}
          />
        </button>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {user?.full_name || 'Loading...'}
            </p>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'capitalize',
              }}
            >
              {(role || '').replace('_', ' ')}
            </p>
          </div>
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={40}
            height={40}
            style={{
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--color-primary-light)',
            }}
          />
        </div>
      </div>
    </header>
  );
}
