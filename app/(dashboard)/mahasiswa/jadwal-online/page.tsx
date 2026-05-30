'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Book, Clock, Video, Monitor, Loader2, Building } from 'lucide-react';

interface JadwalItem {
  nama: string;
  dosen: string;
  sks: number;
  hari: string;
  jam: string;
  ruang: string;
  kode: string;
}

const DAY_COLORS: Record<string, string> = {
  'Senin': '#1976D2',
  'Selasa': '#00897B',
  'Rabu': '#795548',
  'Kamis': '#455A64',
  'Jumat': '#43A047',
  'Sabtu': '#1565C0',
  'Belum Terjadwal': '#757575'
};

export default function MahasiswaJadwalOnlinePage() {
  const { user } = useAuth();
  const [jadwalData, setJadwalData] = useState<Record<string, JadwalItem[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchJadwal = async () => {
    if (!user) return;
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJadwal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <div style={{ padding: '1.5rem', fontFamily: "'Roboto', 'Inter', sans-serif" }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 size={28} style={{ color: '#0b668b', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6c757d', fontSize: '0.9rem', margin: 0 }}>Memuat jadwal aktif dari sistem...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DAYS.map(day => {
            const items = jadwalData[day] || [];
            return (
              <div key={day} style={{ 
                backgroundColor: '#fff', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  backgroundColor: DAY_COLORS[day] || '#1976D2', 
                  color: '#fff', 
                  padding: '16px', 
                  fontWeight: 600, 
                  fontSize: '1.1rem' 
                }}>
                  {day === 'Jumat' ? "Jum'at" : day}
                </div>
                <div style={{ flex: 1 }}>
                  {items.length > 0 ? (
                    items.map((item, idx) => (
                      <div key={idx} style={{ 
                        padding: '16px', 
                        borderBottom: idx !== items.length - 1 ? '1px solid #e0e0e0' : 'none' 
                      }}>
                        <div style={{ 
                          fontWeight: 500, 
                          fontSize: '0.95rem', 
                          color: '#333', 
                          marginBottom: '10px',
                          lineHeight: '1.4'
                        }}>
                          {item.nama}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#666' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Building size={16} style={{ color: '#888' }} />
                            <span>{item.sks} SKS {item.kode ? `- ${item.kode}` : ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={16} style={{ color: '#888' }} />
                            <span>{item.jam && item.jam !== 'Sesuai Jadwal' ? item.jam : '-'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.ruang?.toLowerCase().includes('virtual') || item.ruang?.toLowerCase().includes('online') ? (
                              <Video size={16} style={{ color: '#888' }} />
                            ) : (
                              <Monitor size={16} style={{ color: '#888' }} />
                            )}
                            <span>{item.ruang && item.ruang !== 'Kelas Offline' ? item.ruang : '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '16px', color: '#999', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      Tidak ada jadwal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {jadwalData['Belum Terjadwal'] && jadwalData['Belum Terjadwal'].length > 0 && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: '1 / -1' // span full width
            }}>
              <div style={{ 
                backgroundColor: DAY_COLORS['Belum Terjadwal'], 
                color: '#fff', 
                padding: '16px', 
                fontWeight: 600, 
                fontSize: '1.1rem' 
              }}>
                Belum Terjadwal
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '16px' }}>
                {jadwalData['Belum Terjadwal'].map((item, idx) => (
                  <div key={idx} style={{ 
                    padding: '16px', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px'
                  }}>
                    <div style={{ 
                      fontWeight: 500, 
                      fontSize: '0.95rem', 
                      color: '#333', 
                      marginBottom: '10px',
                      lineHeight: '1.4'
                    }}>
                      {item.nama}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#666' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building size={16} style={{ color: '#888' }} />
                        <span>{item.sks} SKS {item.kode ? `- ${item.kode}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={16} style={{ color: '#888' }} />
                        <span>{item.jam && item.jam !== 'Sesuai Jadwal' ? item.jam : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.ruang?.toLowerCase().includes('virtual') || item.ruang?.toLowerCase().includes('online') ? (
                          <Video size={16} style={{ color: '#888' }} />
                        ) : (
                          <Monitor size={16} style={{ color: '#888' }} />
                        )}
                        <span>{item.ruang && item.ruang !== 'Kelas Offline' ? item.ruang : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
