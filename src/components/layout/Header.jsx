import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user, role } = useAuth();

  return (
    <header className="glass" style={{
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 9,
      borderBottom: '1px solid var(--color-border)',
      marginLeft: '260px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          position: 'relative',
          maxWidth: '400px'
        }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)'
          }} />
          <input 
            type="text" 
            placeholder="Cari mahasiswa, NRP..." 
            className="form-control"
            style={{
              paddingLeft: '2.5rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-background)',
              border: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          color: 'var(--color-text-secondary)'
        }}>
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: 'var(--color-danger)',
            width: '8px',
            height: '8px',
            borderRadius: '50%'
          }}></span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {user?.full_name || 'Loading...'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
              {(role || '').replace('_', ' ')}
            </p>
          </div>
          <img 
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=random`} 
            alt="Avatar" 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--color-primary-light)'
            }}
          />
        </div>
      </div>
    </header>
  );
}
