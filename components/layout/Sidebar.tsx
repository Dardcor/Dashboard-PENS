'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, AlertTriangle, Calendar, LogOut,
  BookOpen, Clock, FileText, CheckSquare, Award, UserCheck,
  Layers, X, MonitorPlay, ChevronDown, ChevronUp, HelpCircle,
  Bell, Video, Play, MessageSquare, Globe, Settings, FileSignature
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
    ujian: pathname.includes('/mahasiswa/uts') || pathname.includes('/mahasiswa/uas'),
    akademik: false,
  });

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const dosenLinks: NavLink[] = [
    { path: '/dosen', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dosen/mahasiswa', icon: Users, label: 'Mahasiswa Binaan' },
    { path: '/dosen/alert', icon: AlertTriangle, label: 'Alert Akademik' },
    { path: '/dosen/jadwal', icon: Calendar, label: 'Jadwal Konsultasi' },
    { path: '/dosen/catatan', icon: FileSignature, label: 'Catatan Perwalian' },
  ];

  const adminLinks: NavLink[] = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/mahasiswa', icon: Users, label: 'Mahasiswa' },
    { path: '/admin/dosen', icon: BookOpen, label: 'Dosen Wali' },
    { path: '/admin/konfigurasi', icon: Settings, label: 'Konfigurasi Alert' },
  ];

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
    { path: '/mahasiswa/quiz', icon: HelpCircle, label: 'Kuis' },
    { path: '/mahasiswa/materi-perkuliahan', icon: Layers, label: 'Materi Perkuliahan' },
    { path: '/mahasiswa/video', icon: Video, label: 'Video Pembelajaran' },
    { path: '/mahasiswa/support', icon: MessageSquare, label: 'Bantuan & Dukungan' },
    { path: '/mahasiswa/notifications', icon: Bell, label: 'Notifikasi' },
    { path: '/mahasiswa/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const links: NavLink[] =
    role === 'admin' ? adminLinks : role === 'dosen_wali' ? dosenLinks : role === 'mahasiswa' ? mhsLinks : [];

  const isActive = (path: string) =>
    pathname === path ||
    (path !== '/dosen' && path !== '/mahasiswa/beranda' && pathname.startsWith(path));

  const avatarUrl =
    user?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? 'User')}&background=0C6B94&color=fff&bold=true`;

  const renderNavLink = (link: NavLink) => {
    const active = isActive(link.path);

    if (link.hasSubmenu) {
      const submenuKey = link.label.toLowerCase().replace(/\s+/g, '-');
      const isSubmenuOpen = openMenus[submenuKey] || active;

      return (
        <li key={link.path} style={{ padding: '0' }}>
          <div
            onClick={() => toggleMenu(submenuKey)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1.25rem',
              padding: '0.75rem 1.25rem',
              fontSize: '0.875rem', cursor: 'pointer',
              color: active || isSubmenuOpen ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
              borderLeft: active || isSubmenuOpen ? '3px solid var(--color-primary)' : '3px solid transparent',
              fontWeight: 400,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)';
              if (!active && !isSubmenuOpen) e.currentTarget.style.color = 'var(--color-sidebar-text-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!active && !isSubmenuOpen) e.currentTarget.style.color = 'var(--color-sidebar-text)';
            }}
          >
            <link.icon size={20} style={{ color: active || isSubmenuOpen ? 'var(--color-sidebar-text-active)' : '#6c757d' }} />
            {link.label}
            {isSubmenuOpen ? (
              <ChevronUp size={18} style={{ marginLeft: 'auto', color: 'var(--color-sidebar-text-active)' }} />
            ) : (
              <ChevronDown size={18} style={{ marginLeft: 'auto', color: '#6c757d' }} />
            )}
          </div>
          {isSubmenuOpen && link.submenus && (
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
                        padding: '0.65rem 1.25rem 0.65rem 3.5rem',
                        textDecoration: 'none', fontSize: '0.875rem',
                        color: subActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                        fontWeight: subActive ? 600 : 400,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-sidebar-text-active)'}
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

    return (
      <li key={link.path} style={{ padding: '0' }}>
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
          <link.icon size={20} style={{ color: active ? 'var(--color-sidebar-text-active)' : '#6c757d' }} />
          {link.label}
        </Link>
      </li>
    );
  };

  return (
    <>
      {isMobile && isOpen && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      )}

      <div
        style={{
          width: '260px',
          height: isMobile ? 'calc(100vh - 60px)' : '100%',
          display: 'flex', flexDirection: 'column',
          backgroundColor: 'var(--color-sidebar)',
          borderRight: '1px solid var(--color-border)',
          zIndex: 45,
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          ...(isMobile
            ? { position: 'fixed', top: '60px', left: 0, transform: !isOpen ? 'translateX(-100%)' : 'translateX(0)' }
            : { position: 'relative', transform: 'none' }),
        }}
      >
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          {isMobile && (
            <button onClick={close} aria-label="Tutup sidebar" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '0.25rem' }}>
              <X size={20} />
            </button>
          )}
          <img src={avatarUrl} alt="Avatar" style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: 500, margin: 0, lineHeight: 1.2 }}>
              {user?.full_name || 'Loading...'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', margin: '0.2rem 0 0 0', textTransform: 'capitalize', fontWeight: 400 }}>
              {(role || '').replace('_', ' ')}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem', margin: 0, padding: 0 }}>
            {links.map(renderNavLink)}

            <li style={{ padding: '0', marginTop: '0.5rem' }}>
              <button
                onClick={logout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1.25rem',
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'transparent', border: 'none', borderLeft: '3px solid transparent',
                  cursor: 'pointer',
                  color: 'var(--color-sidebar-text)', fontWeight: 400, fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <LogOut size={20} style={{ color: '#6c757d' }} />
                Keluar
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
