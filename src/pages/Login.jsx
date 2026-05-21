import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';

// Pesan status bertahap yang ditampilkan ke user selama proses login
const STATUS_STEPS = [
  'Menghubungi server CAS PENS...',
  'Memverifikasi kredensial NetID...',
  'Mengautentikasi ke ETHOL PENS...',
  'Mengambil data profil akademik...',
  'Menyinkronkan data ke sistem...',
  'Membuka sesi Anda...',
];

export default function Login() {
  const [netId,     setNetId]     = useState('');
  const [password,  setPassword]  = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [stepIdx,   setStepIdx]   = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const navigate  = useNavigate();
  const { login, user, role } = useAuth();

  // Redirect jika sudah login
  useEffect(() => {
    if (user && role) {
      if (role === 'dosen_wali') navigate('/dosen');
      else if (role === 'mahasiswa') navigate('/mahasiswa');
      else navigate('/');
    }
  }, [user, role, navigate]);

  // Auto-cycle pesan status saat loading
  useEffect(() => {
    if (!isLoading) { setStepIdx(0); return; }
    const timer = setInterval(() => {
      setStepIdx(prev => {
        const next = prev + 1;
        if (next < STATUS_STEPS.length) {
          setStatusMsg(STATUS_STEPS[next]);
          return next;
        }
        clearInterval(timer);
        return prev;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMsg('');
    setIsLoading(true);
    setStepIdx(0);
    setStatusMsg(STATUS_STEPS[0]);

    try {
      // ── 1. Panggil /api/cas-login (Vite middleware lokal atau Vercel serverless) ──
      const casRes = await fetch('/api/cas-login', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ netId: netId.trim(), password }),
      });

      // Pastikan respons adalah JSON sebelum di-parse
      const contentType = casRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await casRes.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(
          'Server mengembalikan respons yang tidak valid. ' +
          'Pastikan Vercel Serverless Function sudah dikonfigurasi dengan benar.'
        );
      }

      const casData = await casRes.json();

      if (!casRes.ok || !casData.success) {
        throw new Error(casData.message || 'Kredensial yang Anda masukkan salah.');
      }

      // ── 2. Sign in ke Supabase menggunakan bypass password ──
      setStatusMsg(STATUS_STEPS[4]);
      const { error: supaError } = await login(casData.email, BYPASS_PASSWORD);

      if (supaError) {
        throw new Error('Supabase Error: ' + (supaError.message || 'Gagal membuat sesi lokal.'));
      }

      // Redirect ditangani oleh useEffect di atas (saat user & role ter-set)

    } catch (err) {
      console.error('[LOGIN] Error:', err);
      setErrorMsg(err.message);
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>

      {/* Header / Logo */}
      <div style={{ padding: '15px 40px', backgroundColor: 'white' }}>
        <img
          src="/logo.png"
          alt="EEPIS Logo"
          style={{ height: '55px', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
      </div>

      {/* CAS Banner */}
      <div style={{
        backgroundColor: '#273663',
        backgroundImage: 'linear-gradient(to right, #273663, #151e3d)',
        padding: '20px 40px',
        color: 'white',
        borderTop: '2px solid #e2e8f0',
        borderBottom: '4px solid #f59e0b',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 400, letterSpacing: '0.5px' }}>
          EEPIS Central Authentication Service (CAS)
        </h1>
      </div>

      {/* Form Area */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px', flex: 1, backgroundColor: '#f9f9f9' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 420px) minmax(300px, 350px)',
          gap: '2.5rem',
          maxWidth: '850px',
          width: '100%',
        }}>

          {/* Login Form */}
          <div>
            <div style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '25px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#333', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px' }}>
                Enter your NetID and Password
              </h2>

              {/* Error */}
              {errorMsg && (
                <div style={{
                  padding: '10px 15px', marginBottom: '20px',
                  backgroundColor: '#fee2e2', border: '1px solid #f87171',
                  color: '#b91c1c', borderRadius: '3px', fontSize: '0.85rem',
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Status */}
              {statusMsg && !errorMsg && (
                <div style={{
                  padding: '10px 15px', marginBottom: '20px',
                  backgroundColor: '#e0f2fe', border: '1px solid #38bdf8',
                  color: '#0284c7', borderRadius: '3px', fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  {/* Spinner */}
                  <span style={{
                    display: 'inline-block', width: '12px', height: '12px',
                    border: '2px solid #38bdf8', borderTopColor: '#0284c7',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  {statusMsg}
                </div>
              )}

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '0.9rem', color: '#444', fontWeight: 'bold' }}>NetID:</label>
                  <input
                    id="cas-netid"
                    type="text"
                    value={netId}
                    onChange={e => setNetId(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="contoh: syahrulardi@it.student.pens.ac.id"
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #94a3b8', borderRadius: '3px', fontSize: '0.9rem', opacity: isLoading ? 0.6 : 1 }}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '0.9rem', color: '#444', fontWeight: 'bold' }}>Password:</label>
                  <input
                    id="cas-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #94a3b8', borderRadius: '3px', fontSize: '0.9rem', opacity: isLoading ? 0.6 : 1 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginLeft: '90px' }}>
                  <button
                    id="cas-login-btn"
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#273663', color: 'white',
                      border: '1px solid #151e3d', padding: '6px 20px',
                      borderRadius: '3px', fontSize: '0.9rem', fontWeight: 'bold',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    {isLoading ? 'MEMPROSES...' : 'LOGIN'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#f8fafc', color: '#333',
                      border: '1px solid #94a3b8', padding: '6px 20px',
                      borderRadius: '3px', fontSize: '0.9rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    clear
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right panel */}
          <div>
            <div style={{ marginBottom: '30px' }}>
              <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: '1.6', margin: '0 0 10px 0' }}>
                For security reasons, please <strong>Log Out</strong> and Exit your web browser
                when you are done accessing services that require authentication!
              </p>
              {isLoading && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fefce8', border: '1px solid #fbbf24', borderRadius: '4px', fontSize: '0.8rem', color: '#92400e' }}>
                  ⏳ Proses login membutuhkan waktu 10–30 detik karena sistem sedang mengambil data akademik dari ETHOL PENS secara otomatis.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 40px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#64748b',
        fontSize: '0.8rem',
      }}>
        <div>Powered by JA-SIG Central Authentication Service 3.4.2.1</div>
        <div>Politeknik Elektronika Negeri Surabaya</div>
      </div>
    </div>
  );
}
