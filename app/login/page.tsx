'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase as supabaseClient } from '../../lib/supabase';

const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';

const STATUS_STEPS = [
  'Menghubungi server CAS PENS...',
  'Memverifikasi kredensial NetID...',
  'Mengautentikasi ke ETHOL PENS...',
  'Mengambil data profil akademik...',
  'Menyinkronkan data ke sistem...',
  'Membuka sesi Anda...',
];

export default function LoginPage() {
  const [netId,     setNetId]     = useState('');
  const [password,  setPassword]  = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [stepIdx,   setStepIdx]   = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { login, user, role, setLocalSession } = useAuth();


  useEffect(() => {
    if (user && role) {
      if (role === 'dosen_wali')     router.replace('/dosen');
      else if (role === 'mahasiswa') router.replace('/mahasiswa/beranda');
      else                           router.replace('/');
    }
  }, [user, role, router]);


  useEffect(() => {
    if (!isLoading) { setStepIdx(0); return; }
    const timer = setInterval(() => {
      setStepIdx((prev) => {
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

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMsg('');
    setIsLoading(true);
    setStepIdx(0);
    setStatusMsg(STATUS_STEPS[0]);

    try {
      const casRes = await fetch('/api/mahasiswa/cas-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ netId: netId.trim(), password }),
      });

      const contentType = casRes.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await casRes.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(
          'Server mengembalikan respons yang tidak valid. ' +
          'Pastikan Next.js API Route sudah dikonfigurasi dengan benar.'
        );
      }

      const casData = await casRes.json();
      if (!casRes.ok || !casData.success) {
        throw new Error(casData.message || 'Kredensial yang Anda masukkan salah.');
      }

      setStatusMsg(STATUS_STEPS[4]);

      setLocalSession({
        id: casData.uid,
        email: casData.email,
        role: casData.role,
        full_name: casData.fullName,
        created_at: new Date().toISOString()
      });

      if (casData.access_token && casData.refresh_token) {
        try {
          await supabaseClient.auth.setSession({
            access_token: casData.access_token,
            refresh_token: casData.refresh_token,
          });
        } catch (e) {
          console.warn(e);
        }
      }

      setStatusMsg(STATUS_STEPS[5]);
      await new Promise(r => setTimeout(r, 500));
      if (casData.role === 'dosen_wali') {
        router.replace('/dosen');
      } else {
        router.replace('/mahasiswa/beranda');
      }
      return;
    } catch (err) {
      const error = err as Error;
      console.error('[LOGIN] Error:', error);
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header / Logo */}
      <div style={{ width: '100%', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '15px 15px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="PENS Logo"
            style={{ height: '45px', cursor: 'pointer', objectFit: 'contain' }}
            onClick={() => router.push('/landing')}
          />
        </div>
      </div>

      {/* CAS Banner */}
      <div
        style={{
          backgroundColor: '#1D1268',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '15px 15px' }}>
          <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: 'normal', fontFamily: '"Times New Roman", Times, serif' }}>
            EEPIS Central Authentication Service (CAS)
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          width: '100%',
          flex: 1,
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '30px',
            maxWidth: '960px',
            margin: '0 auto',
            padding: '25px 15px',
          }}
        >
          {/* Left Panel - Login Form */}
          <div style={{ width: '320px', flexShrink: 0 }}>
            <div
              style={{
                backgroundColor: '#f0f0f0',
                border: '1px solid #dcdcdc',
                borderRadius: '5px',
                padding: '20px',
              }}
            >
              <h2
                style={{
                  margin: '0 0 15px 0',
                  fontSize: '16px',
                  color: '#333',
                  fontWeight: 'normal',
                  borderBottom: '1px dotted #bbb',
                  paddingBottom: '10px',
                  fontFamily: '"Times New Roman", Times, serif'
                }}
              >
                Enter your NetID and Password
              </h2>

              {errorMsg && (
                <div
                  style={{
                    padding: '8px',
                    marginBottom: '15px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #f87171',
                    color: '#b91c1c',
                    fontSize: '11px',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {statusMsg && !errorMsg && (
                <div
                  style={{
                    padding: '8px',
                    marginBottom: '15px',
                    backgroundColor: '#e0f2fe',
                    border: '1px solid #38bdf8',
                    color: '#0284c7',
                    fontSize: '11px',
                  }}
                >
                  {statusMsg}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                    NetID:
                  </label>
                  <input
                    id="cas-netid"
                    type="text"
                    value={netId}
                    onChange={(e) => setNetId(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '3px',
                      border: '1px solid #7F9DB9',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                    Password:
                  </label>
                  <input
                    id="cas-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '3px',
                      border: '1px solid #7F9DB9',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', gap: '5px' }}>
                  <input type="checkbox" id="warn" style={{ margin: '1px 0 0 0' }} />
                  <label htmlFor="warn" style={{ fontSize: '11px', color: '#777', lineHeight: '1.4' }}>
                    Warn me before logging me into other sites.
                  </label>
                </div>

                <div style={{ borderTop: '1px dotted #bbb', paddingTop: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    id="cas-login-btn"
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#000',
                      border: '1px solid #999',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: isLoading ? 'wait' : 'pointer',
                    }}
                  >
                    LOGIN
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#777',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    clear
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel - Info & Languages */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: '#555', margin: '0 0 25px 0' }}>
              For security reasons, please Log Out and Exit your web browser when you are done accessing services that require authentication!
            </p>

            <div>
              <div style={{ color: '#333', fontSize: '12px', marginBottom: '4px' }}>Languages:</div>
              <div style={{ fontSize: '11px', lineHeight: '1.8' }}>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>English</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Spanish</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>French</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Russian</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Nederlands</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Svenskt</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Italiano</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Urdu</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Chinese (Simplified)</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Deutsch</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Japanese</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Croatian</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Czech</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Slovenian</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Polish</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', marginRight: '5px' }}>Portuguese (Brazil)</a>
                <a href="#" style={{ color: '#0000EE', textDecoration: 'underline' }}>Turkish</a>
              </div>
            </div>
            
            {isLoading && (
              <div
                style={{
                  marginTop: '30px',
                  padding: '8px',
                  backgroundColor: '#fefce8',
                  border: '1px solid #fbbf24',
                  fontSize: '11px',
                  color: '#92400e',
                }}
              >
                ⏳ Mengautentikasi dan menyinkronkan data dari ETHOL PENS... (10-30 detik)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ width: '100%', backgroundColor: 'white', paddingBottom: '20px' }}>
        <div style={{ 
          maxWidth: '960px', 
          margin: '20px auto 0 auto', 
          borderTop: '1px dotted #ccc',
          padding: '15px 15px 0 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#777' }}>
            Powered by <a href="#" style={{ color: '#0000EE', textDecoration: 'underline' }}>JA-SIG Central Authentication Service</a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="PENS Logo"
            style={{ height: '30px', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );
}
