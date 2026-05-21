import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';

export default function Login() {
  const [netId, setNetId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, user, role, logout } = useAuth();

  useEffect(() => {
    if (user && role) {
      if (role === 'dosen_wali') navigate('/dosen');
      else if (role === 'mahasiswa') navigate('/mahasiswa');
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setIsLoading(true);

    try {
      setStatusMsg('Mengautentikasi ke PENS CAS...');
      
      const casRes = await fetch('/api/cas-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ netId: netId.trim(), password }),
      });

      const casData = await casRes.json();

      if (!casRes.ok || !casData.success) {
        throw new Error(casData.message || 'Kredensial yang Anda masukkan salah.');
      }

      setStatusMsg('Menyinkronkan data dengan Supabase...');
      
      const email = casData.email;
      const { error } = await login(email, BYPASS_PASSWORD);

      if (error) {
        throw new Error('Supabase Error: ' + (error.message || 'Gagal membuat sesi lokal.'));
      }

    } catch (error) {
      console.error("Full Login Error:", error);
      setErrorMsg(error.message);
      setStatusMsg('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setNetId('');
    setPassword('');
    setErrorMsg('');
    setStatusMsg('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      
      <div style={{ padding: '15px 40px', backgroundColor: 'white' }}>
        <img src="/logo.png" alt="EEPIS Logo" style={{ height: '55px', cursor: 'pointer' }} onClick={() => navigate('/')} />
      </div>

      <div style={{ backgroundColor: '#273663', backgroundImage: 'linear-gradient(to right, #273663, #151e3d)', padding: '20px 40px', color: 'white', borderTop: '2px solid #e2e8f0', borderBottom: '4px solid #f59e0b' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 400, letterSpacing: '0.5px' }}>EEPIS Central Authentication Service (CAS)</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px', flex: 1, backgroundColor: '#f9f9f9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 420px) minmax(300px, 350px)', gap: '2.5rem', maxWidth: '850px', width: '100%' }}>
          
          <div>
            <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#333', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px' }}>Enter your NetID and Password</h2>

              {errorMsg && (
                <div style={{ padding: '10px 15px', marginBottom: '20px', backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '3px', fontSize: '0.85rem' }}>
                  {errorMsg}
                </div>
              )}

              {statusMsg && !errorMsg && (
                <div style={{ padding: '10px 15px', marginBottom: '20px', backgroundColor: '#e0f2fe', border: '1px solid #38bdf8', color: '#0284c7', borderRadius: '3px', fontSize: '0.85rem' }}>
                  {statusMsg}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '0.9rem', color: '#444', fontWeight: 'bold' }}>NetID:</label>
                  <input type="text" value={netId} onChange={(e) => setNetId(e.target.value)} required style={{ flex: 1, padding: '8px 12px', border: '1px solid #94a3b8', borderRadius: '3px', fontSize: '0.95rem' }} autoFocus />
                </div>
                
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '0.9rem', color: '#444', fontWeight: 'bold' }}>Password:</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ flex: 1, padding: '8px 12px', border: '1px solid #94a3b8', borderRadius: '3px', fontSize: '0.95rem' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginLeft: '90px' }}>
                  <button type="submit" disabled={isLoading} style={{ backgroundColor: '#273663', color: 'white', border: '1px solid #151e3d', padding: '6px 20px', borderRadius: '3px', fontSize: '0.9rem', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                    {isLoading ? 'LOGGING IN...' : 'LOGIN'}
                  </button>
                  <button type="button" onClick={handleClear} style={{ backgroundColor: '#f8fafc', color: '#333', border: '1px solid #94a3b8', padding: '6px 20px', borderRadius: '3px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    clear
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '30px' }}>
              <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: '1.5', margin: '0 0 10px 0' }}>For security reasons, please Log Out and Exit your web browser when you are done accessing services that require authentication!</p>
            </div>
          </div>

        </div>
      </div>

      <div style={{ padding: '20px 40px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
        <div>Powered by JA-SIG Central Authentication Service 3.4.2.1</div>
        <div>Politeknik Elektronika Negeri Surabaya</div>
      </div>
    </div>
  );
}
