'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, AlertTriangle, Calendar, LogOut,
  BookOpen, FileText, CheckSquare, X,
  ChevronDown, ChevronUp, FileSignature,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  path: string;
  icon: LucideIcon;
  label: string;
  hasSubmenu?: boolean;
  submenus?: { path: string; label: string }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { isOpen, close, isMobile } = useSidebar();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'ujian-online': pathname.includes('/mahasiswa/uts') || pathname.includes('/mahasiswa/uas') || pathname.includes('/mahasiswa/ujian-online'),
  });

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Dosen Wali links ──────────────────────────────────────────
  const dosenLinks: NavLink[] = [
    { path: '/dosen', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dosen/mahasiswa', icon: Users, label: 'Mahasiswa Binaan' },
    { path: '/dosen/alert', icon: AlertTriangle, label: 'Alert Akademik' },
    { path: '/dosen/jadwal', icon: Calendar, label: 'Jadwal Konsultasi' },
    { path: '/dosen/catatan', icon: FileSignature, label: 'Catatan Perwalian' },
  ];

  // ── Mahasiswa links — EXACT match with ETHOL PENS sidebar ─────
  // ETHOL sidebar DOM only has: Beranda, Matakuliah, Jadwal Online,
  // Tugas Online, Ujian Online (dropdown UTS/UAS), Keluar.
  // NO: Kuis, Materi Perkuliahan, Video Pembelajaran, Bantuan & Dukungan
  const mhsLinks: NavLink[] = [
    { path: '/mahasiswa/beranda', icon: LayoutDashboard, label: 'Beranda' },
    { path: '/mahasiswa/matakuliah', icon: BookOpen, label: 'Matakuliah' },
    { path: '/mahasiswa/jadwal-online', icon: Calendar, label: 'Jadwal Online' },
    { path: '/mahasiswa/tugas-online', icon: CheckSquare, label: 'Tugas Online' },
    {
      path: '/mahasiswa/ujian-online',
      icon: FileText,
      label: 'Ujian Online',
      hasSubmenu: true,
      submenus: [
        { path: '/mahasiswa/uts', label: 'UTS' },
        { path: '/mahasiswa/uas', label: 'UAS' },
      ],
    },
  ];

  const links: NavLink[] =
    role === 'dosen_wali' ? dosenLinks : role === 'mahasiswa' ? mhsLinks : [];

  const isActive = (path: string) =>
    pathname === path ||
    (path !== '/dosen' && path !== '/mahasiswa/beranda' && pathname.startsWith(path));

  const avatarUrl =
    user?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? 'User')}&background=0C6B94&color=fff&bold=true`;

  // ── Render a single nav link (with optional submenu) ──────────
  const renderNavLink = (link: NavLink) => {
    const active = isActive(link.path);

    if (link.hasSubmenu) {
      const key = link.label.toLowerCase().replace(/\s+/g, '-');
      const open = openMenus[key] ?? active;

      return (
        <li key={link.path} style={{ padding: 0 }}>
          {/* Parent row */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleMenu(key)}
            onKeyDown={(e) => e.key === 'Enter' && toggleMenu(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1.25rem',
              padding: '0.75rem 1.25rem',
              fontSize: '0.875rem', cursor: 'pointer',
              color: active || open ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
              borderLeft: active || open ? '3px solid var(--color-primary)' : '3px solid transparent',
              backgroundColor: active || open ? 'var(--color-sidebar-hover)' : 'transparent',
              fontWeight: active || open ? 600 : 400,
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (!active && !open) {
                e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)';
                e.currentTarget.style.color = 'var(--color-sidebar-text-active)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active && !open) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-sidebar-text)';
              }
            }}
          >
            <link.icon
              size={20}
              style={{ color: active || open ? 'var(--color-sidebar-text-active)' : '#6c757d', flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>{link.label}</span>
            {open
              ? <ChevronUp size={16} style={{ color: 'var(--color-sidebar-text-active)' }} />
              : <ChevronDown size={16} style={{ color: '#6c757d' }} />}
          </div>

          {/* Submenu items */}
          {open && link.submenus && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {link.submenus.map((sub) => {
                const subActive = pathname === sub.path;
                return (
                  <li key={sub.path}>
                    <Link
                      href={sub.path}
                      onClick={() => isMobile && close()}
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: '0.6rem 1.25rem 0.6rem 3.75rem',
                        textDecoration: 'none', fontSize: '0.85rem',
                        color: subActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                        backgroundColor: subActive ? 'rgba(23,121,186,0.05)' : 'transparent',
                        fontWeight: subActive ? 600 : 400,
                        transition: 'all 0.2s ease',
                        borderLeft: subActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!subActive) e.currentTarget.style.color = 'var(--color-sidebar-text-active)'; }}
                      onMouseLeave={(e) => { if (!subActive) e.currentTarget.style.color = 'var(--color-sidebar-text)'; }}
                    >
                      {sub.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    // Plain link
    return (
      <li key={link.path} style={{ padding: 0 }}>
        <Link
          href={link.path}
          onClick={() => isMobile && close()}
          style={{
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            padding: '0.75rem 1.25rem',
            textDecoration: 'none', fontSize: '0.875rem',
            color: active ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
            backgroundColor: active ? 'var(--color-sidebar-hover)' : 'transparent',
            borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
            fontWeight: active ? 600 : 400,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)';
              e.currentTarget.style.color = 'var(--color-sidebar-text-active)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-sidebar-text)';
            }
          }}
        >
          <link.icon
            size={20}
            style={{ color: active ? 'var(--color-sidebar-text-active)' : '#6c757d', flexShrink: 0 }}
          />
          {link.label}
        </Link>
      </li>
    );
  };

  // ── Sidebar container ─────────────────────────────────────────
  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.45)' }}
        />
      )}

      <div
        style={{
          width: '260px',
          height: isMobile ? 'calc(100vh - 60px)' : '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-sidebar)',
          borderRight: '1px solid var(--color-border)',
          zIndex: 45,
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'hidden',
          ...(isMobile
            ? { position: 'fixed', top: '60px', left: 0, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }
            : { position: 'relative', transform: 'none' }),
        }}
      >
        {/* ── User profile section (matches ETHOL: avatar + name + role) ── */}
        <div
          style={{
            padding: '1.25rem 1rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '0.85rem',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {isMobile && (
            <button
              onClick={close}
              aria-label="Tutup sidebar"
              style={{
                position: 'absolute', top: '0.5rem', right: '0.5rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: '0.25rem',
              }}
            >
              <X size={18} />
            </button>
          )}
          {/* Avatar */}
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          {/* Name & role */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.full_name || 'Loading...'}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                marginTop: '0.1rem',
                textTransform: 'capitalize',
              }}
            >
              {(role || '').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* ── Nav links (exact ETHOL order) ─────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {links.map(renderNavLink)}
          </ul>
        </div>

        {/* ── Keluar button (matches ETHOL exactly) ──────────────── */}
        <div style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '1.25rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: 'transparent', border: 'none',
              borderLeft: '3px solid transparent',
              cursor: 'pointer',
              color: 'var(--color-sidebar-text)',
              fontWeight: 400, fontSize: '0.875rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-sidebar-text)';
            }}
          >
            <LogOut size={20} style={{ color: '#6c757d' }} />
            Keluar
          </button>
        </div>
      </div>
    </>
  );
}
