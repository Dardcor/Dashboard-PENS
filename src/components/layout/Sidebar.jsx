import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { role, logout } = useAuth();

  const dosenLinks = [
    { path: '/dosen', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dosen/mahasiswa', icon: Users, label: 'Mahasiswa Binaan' },
    { path: '/dosen/alert', icon: AlertTriangle, label: 'Alert Akademik' },
    { path: '/dosen/jadwal', icon: Calendar, label: 'Jadwal Konsultasi' },
  ];

  const mhsLinks = [
    { path: '/mahasiswa', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mahasiswa/jadwal', icon: Calendar, label: 'Jadwal Konsultasi' },
  ];

  const links = role === 'dosen_wali' ? dosenLinks : role === 'mahasiswa' ? mhsLinks : [];

  return (
    <div className="glass" style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--color-border)',
      zIndex: 10
    }}>
      <div className="p-6 border-b" style={{ borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '40px', height: 'auto' }} />
        <div>
          <h2 style={{ color: 'var(--color-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>
            PENS Wali
          </h2>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>Dashboard Monitoring</p>
        </div>
      </div>

      <div className="p-4" style={{ flex: 1 }}>
        <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menu Utama</p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {links.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/dosen' && link.path !== '/mahasiswa' && location.pathname.startsWith(link.path));
            return (
              <li key={link.path}>
                <Link to={link.path} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all var(--transition-fast)'
                }}>
                  <link.icon size={20} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button onClick={logout} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-danger)',
          fontWeight: 500,
          transition: 'all var(--transition-fast)'
        }}>
          <LogOut size={20} />
          Keluar
        </button>
      </div>
    </div>
  );
}
