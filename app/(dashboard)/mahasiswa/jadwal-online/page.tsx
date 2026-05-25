'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react';

interface ScheduledItem {
  nama: string;
  dosen: string;
  sks: number;
  jam: string;
  ruang: string;
}

export default function MahasiswaJadwalOnlinePage() {
  const { user } = useAuth();
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduledItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const [selectedDay, setSelectedDay] = useState('Senin');

  const fetchSchedule = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || `bypass-token-for-${user.id}`;
      
      const res = await fetch('/api/mahasiswa/cas-jadwal-online', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          const grouped: Record<string, ScheduledItem[]> = {};
          
          DAYS.forEach(day => {
            grouped[day] = [];
          });

          body.data.forEach((item: any) => {
            const day = item.hari || 'Senin';
            const scheduledItem: ScheduledItem = {
              nama: item.matakuliah || item.nama_matakuliah || 'Mata Kuliah',
              dosen: item.dosen || 'Dosen Pengampu',
              sks: item.sks || 3,
              jam: `${item.jamAwal || item.jam_awal || '08:00'} - ${item.jamAkhir || item.jam_akhir || '10:00'}`,
              ruang: item.ruang || 'Kelas Virtual / Offline'
            };
            if (grouped[day]) {
              grouped[day].push(scheduledItem);
            } else {
              grouped[day] = [scheduledItem];
            }
          });

          setScheduleData(grouped);
        }
      }
    } catch (e) {
      console.error('Failed to fetch schedule:', e);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [user]);

  // Find day of the week to highlight
  useEffect(() => {
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = dayMap[todayIndex];
    if (DAYS.includes(currentDay)) {
      setSelectedDay(currentDay);
    }
  }, []);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Jadwal Online Mingguan
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Jadwal perkuliahan sinkron harian Anda di platform ETHOL PENS.
          </p>
        </div>
        <button 
          onClick={fetchSchedule}
          disabled={syncing}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {syncing ? 'Menyinkronkan...' : 'Sinkronisasi Ulang'}
        </button>
      </div>

      <div
        className="card mb-6"
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflowX: 'auto',
        }}
      >
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: selectedDay === day ? 'var(--color-primary)' : 'transparent',
              color: selectedDay === day ? 'white' : 'var(--color-text-secondary)',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-6 text-muted">Memuat jadwal online dari ETHOL...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {scheduleData[selectedDay]?.map((item, idx) => (
            <div
              key={idx}
              className="card p-5 animate-scale-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--color-border)',
                gap: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div
                  style={{
                    width: '90px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={16} style={{ marginBottom: '0.25rem' }} />
                  <span>{item.jam.split(' ')[0]}</span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                    {item.nama}
                  </h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.15rem 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={12} />
                    Dosen: {item.dosen} &bull; {item.sks} SKS
                  </p>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <MapPin size={12} />
                    {item.ruang}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.8rem',
                  padding: '0.5rem 0.75rem'
                }}
              >
                <span>Akses Kelas</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}

          {(!scheduleData[selectedDay] || scheduleData[selectedDay].length === 0) && (
            <div className="card p-8 text-center text-muted" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              Tidak ada jadwal perkuliahan untuk hari ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
