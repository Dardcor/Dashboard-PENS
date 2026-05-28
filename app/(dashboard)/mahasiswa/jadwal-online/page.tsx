'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { BookOpen, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

interface JadwalItem {
  nama: string;
  dosen: string;
  sks: number;
  hari: string;
  jam: string;
  ruang: string;
  kode: string;
}

// ─── Tag color matching ETHOL colors ──────────────────────────────────────────
function getTagColor(kode: string, nama: string): string {
  const k = kode.toUpperCase();
  const n = nama.toUpperCase();
  if (k === 'WPF' || n.includes('PEMROGRAMAN FRAMEWORK')) return '#1976D2'; // blue darken-2
  if (k === 'WDP' || n.includes('DESAIN PENGALAMAN') || n.includes('UX')) return '#00838F'; // cyan darken-3
  if (k === 'PPA' || n.includes('PROYEK AKHIR') || n.includes('PROPOSAL')) return '#795548'; // brown
  if (k === 'WAJ' || n.includes('JARINGAN')) return '#2196F3'; // blue
  if (k === 'WAB' || n.includes('BASIS DATA') || n.includes('DATABASE')) return '#01579B'; // light-blue darken-4
  if (k === 'WAK' || n.includes('KOMPUTASI AWAN') || n.includes('CLOUD')) return '#43A047'; // green darken-1
  if (k === 'WPB' || n.includes('PERANGKAT BERGERAK') || n.includes('MOBILE')) return '#C62828'; // red darken-3
  if (k === 'WAG' || n.includes('AGILE')) return '#8D6E63'; // brown light
  if (k === 'PKB' || k === 'PRA' || n.includes('KECERDASAN BUATAN') || n.includes('AI')) return '#00838F'; // cyan darken-3
  if (k === 'BI' || n.includes('BAHASA INDONESIA')) return '#455A64'; // blue-grey darken-2
  
  // Fallback: hash-based color
  let hash = 0;
  for (let i = 0; i < nama.length; i++) hash = nama.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#1976D2', '#00838F', '#795548', '#2196F3', '#01579B', '#43A047', '#C62828', '#455A64'];
  return colors[Math.abs(hash) % colors.length];
}

export default function MahasiswaJadwalOnlinePage() {
  const { user } = useAuth();
  const [jadwalData, setJadwalData] = useState<Record<string, JadwalItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Belum Terjadwal'];
  const [selectedDay, setSelectedDay] = useState('Senin');

  // Get current date info
  const today = new Date();
  const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayMap[today.getDay()];

  const fetchJadwal = async (silent = false) => {
    if (!user) return;
    if (!silent) setSyncing(true);
    try {
      const email = encodeURIComponent(user.email || '');
      const res = await fetch(`/api/mahasiswa/jadwal-online-data?user_id=${user.id}&email=${email}`);
      if (res.ok) {
        const body = await res.json();
        if (body.jadwal) {
          setJadwalData(body.jadwal);
        }
      }
    } catch (e) {
      console.error('Failed to fetch jadwal:', e);
    } finally {
      if (!silent) setSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (DAYS.includes(todayName)) {
        setSelectedDay(todayName);
      }
      if (mounted) await fetchJadwal(true);
    }
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedItems = jadwalData[selectedDay] || [];

  return (
    <div style={{ padding: '1.5rem', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* ── Filter bar exactly like ETHOL (mostly just refresh button on this page) ── */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '1.5rem',
        alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap',
      }}>
        <button
          onClick={() => fetchJadwal()}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 1rem',
            backgroundColor: '#fff', border: '1px solid #ced4da',
            borderRadius: '4px', color: '#495057', fontSize: '0.85rem',
            fontWeight: 500, cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {syncing
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#0b668b' }} />
            : <RefreshCw size={14} style={{ color: '#0b668b' }} />}
          {syncing ? 'Menyinkronkan...' : 'Sinkronisasi Ulang'}
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 size={28} style={{ color: '#0b668b', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6c757d', fontSize: '0.9rem', margin: 0 }}>Memuat jadwal aktif dari sistem...</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '4px',
          boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
        }}>
          
          {/* Vuetify-style Tabs */}
          <div style={{
            display: 'flex', overflowX: 'auto', borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#fff',
          }}>
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const hasItems = (jadwalData[day]?.length || 0) > 0;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    padding: '0 16px',
                    height: '48px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: isSelected ? '2px solid #0b668b' : '2px solid transparent',
                    color: isSelected ? '#0b668b' : 'rgba(0, 0, 0, 0.54)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    letterSpacing: '0.0892857143em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: '0.3s cubic-bezier(0.25, 0.8, 0.5, 1)',
                  }}
                >
                  {day}
                  {hasItems && (
                    <span style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#0b668b' : 'rgba(0,0,0,0.38)',
                      color: '#fff',
                      fontSize: '11px',
                      lineHeight: '20px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}>
                      {jadwalData[day].length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content area */}
          <div style={{ padding: '1.5rem' }}>
            {selectedItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <BookOpen size={48} style={{ color: '#e0e0e0', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', color: '#757575', fontWeight: 400, margin: 0 }}>
                  {selectedDay === 'Belum Terjadwal' 
                    ? 'Tidak ada mata kuliah yang belum terjadwal' 
                    : `Tidak ada jadwal perkuliahan untuk hari ${selectedDay}`}
                </h3>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}>
                {selectedItems.map((item, idx) => {
                  const tagBg = getTagColor(item.kode, item.nama);
                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '160px',
                        position: 'relative',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', width: '100%' }}>
                        {/* Left Side (Text) */}
                        <div style={{ flex: '0 0 83.333333%' }}>
                          <div style={{ marginTop: '6px' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: '2rem', letterSpacing: '0.0125em', color: 'rgba(0,0,0,0.87)' }}>
                              {item.nama}
                            </span>
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.6)' }}>
                              {item.dosen}
                            </span>
                          </div>
                          <div style={{ marginTop: '18px' }}></div>
                          <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(0,0,0,0.87)' }}>
                              {item.hari !== 'Sesuai Jadwal' && item.jam !== 'Sesuai Jadwal'
                                ? `${item.hari}, ${item.jam}`
                                : 'Belum Terjadwal'}
                            </span>
                            <br />
                            <span style={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.6)' }}>
                              {item.ruang !== 'Kelas Offline' ? `Ruang: ${item.ruang}` : 'Kelas Virtual / Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Right Side (Avatar) */}
                        <div style={{ flex: '0 0 16.666667%', position: 'relative' }}>
                          <div style={{
                            height: '45px', minWidth: '45px', width: '45px',
                            backgroundColor: tagBg,
                            color: '#fff', fontWeight: 'bold',
                            borderRadius: '6px',
                            position: 'absolute', right: '0px', top: '0px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem'
                          }}>
                            {item.kode || 'MK'}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Button */}
                      <button
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#0b668b',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          letterSpacing: '0.0892857143em',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          padding: '0 8px',
                          height: '36px',
                          borderRadius: '4px',
                        }}
                      >
                        Akses Kuliah
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
