import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, user, role } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      if (role === 'dosen_wali') navigate('/dosen');
      else if (role === 'mahasiswa') navigate('/mahasiswa');
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const { error } = await login(email, password);
      if (error) throw error;
      // Note: redirect is handled by useEffect when context updates user/role
    } catch (error) {
      setErrorMsg(error.message || 'Gagal login. Periksa email dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-background)',
      backgroundImage: 'radial-gradient(var(--color-primary-light) 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/logo.png" 
            alt="Logo PENS" 
            style={{
              width: '80px',
              height: 'auto',
              margin: '0 auto 1rem',
              display: 'block'
            }}
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Selamat Datang</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Login ke Dashboard Wali PENS</p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email PENS</label>
            <input 
              type="email" 
              className="form-control" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@pens.ac.id"
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', fontSize: '1rem', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
