'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, AlertTriangle, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  path: string;
  icon: LucideIcon;
  label: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { role, logout } = useAuth();

  const dosenLinks: NavLink[] = [
    { path: '/dosen',           icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dosen/mahasiswa', icon: Users,            label: 'Mahasiswa Binaan' },
    { path: '/dosen/alert',     icon: AlertTriangle,    label: 'Alert Akademik' },
    { path: '/dosen/jadwal',    icon: Calendar,         label: 'Jadwal Konsultasi' },
  ];

  const mhsLinks: NavLink[] = [
    { path: '/mahasiswa',        icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mahasiswa/jadwal', icon: Calendar,        label: 'Jadwal Konsultasi' },
  ];

  const links: NavLink[] =
    role === 'dosen_wali' ? dosenLinks : role === 'mahasiswa' ? mhsLinks : [];

  const isActive = (path: string) =>
    pathname === path ||
    (path !== '/dosen' && path !== '/mahasiswa' && pathname.startsWith(path));

  return (
    <div
      className="glass"
      style={{
        width: '260px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--color-border)',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        className="p-6"
        style={{
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo PENS" style={{ width: '40px', height: 'auto' }} />
        <div>
          <h2 style={{ color: 'var(--color-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>
            PENS Wali
          </h2>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>
            Dashboard Monitoring
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4" style={{ flex: 1 }}>
        <p
          className="text-muted"
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Menu Utama
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {links.map((link) => {
            const active = isActive(link.path);
            return (
              <li key={link.path}>
                <Link
                  href={link.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                    fontWeight: active ? 600 : 500,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <link.icon size={20} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Logout */}
      <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-danger)',
            fontWeight: 500,
            transition: 'all var(--transition-fast)',
          }}
        >
          <LogOut size={20} />
          Keluar
        </button>
      </div>
    </div>
  );
}
