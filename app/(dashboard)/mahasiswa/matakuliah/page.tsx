'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { BookOpen, User, Calendar, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface EnrolledCourse {
  id: string;
  nama: string;
  dosen: string;
  sks: number;
  hari: string;
  jam: string;
  ruang: string;
  kode: string;
}

export default function MahasiswaMatakuliahPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadLocalCourses = async () => {
    if (!user) return;
    try {
      const { data: mhs } = await supabase.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
      if (!mhs) return;

      const { data: supaKehadiran, error } = await supabase
        .from('kehadiran')
        .select('mata_kuliah:mata_kuliah_id(id, nama, kode, sks, dosen, hari, jam, ruang)')
        .eq('mahasiswa_id', mhs.id);

      if (!error && supaKehadiran && supaKehadiran.length > 0) {
        const uniqueCourses = new Map();
        for (const k of supaKehadiran) {
          const mk = k.mata_kuliah as any;
          if (mk && !uniqueCourses.has(mk.id)) {
            uniqueCourses.set(mk.id, {
              id: mk.id,
              nama: mk.nama,
              dosen: mk.dosen || 'Dosen Pengampu',
              sks: mk.sks ?? 3,
              hari: mk.hari || 'Sesuai Jadwal',
              jam: mk.jam || 'Sesuai Jadwal',
              ruang: mk.ruang || 'Kelas Virtual / Offline',
              kode: mk.kode || 'MK-PENS'
            });
          }
        }
        setCourses(Array.from(uniqueCourses.values()));
      } else {
        setCourses([]);
      }
    } catch (e) {
      console.error(e);
      setCourses([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initRealtime() {
      if (!user) return;
      setLoading(true);
      await loadLocalCourses();
      if (isMounted) setLoading(false);

      // Auto-sync in background to guarantee realtime parity
      if (isMounted) setSyncing(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token || `bypass-token-for-${user.id}`;
        if (token) {
          const res = await fetch('/api/mahasiswa/cas-matakuliah', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok && isMounted) {
            await loadLocalCourses();
          }
        }
      } catch (e) {
        console.error('Background realtime sync failed', e);
      } finally {
        if (isMounted) setSyncing(false);
      }
    }
    initRealtime();
    return () => { isMounted = false; };
  }, [user]);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || `bypass-token-for-${user.id}`;
      
      const res = await fetch('/api/mahasiswa/cas-matakuliah', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await loadLocalCourses();
      } else {
        alert("Gagal sinkronisasi data dari ETHOL");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan sistem: ${e.message || e}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      {/* Dropdown Filters matching ETHOL */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.2rem', marginLeft: '0.2rem' }}>Tahun Ajaran</label>
          <select 
            style={{ 
              padding: '0.5rem 2rem 0.5rem 1rem', 
              borderRadius: '4px', 
              border: '1px solid #ced4da', 
              backgroundColor: '#fff',
              fontSize: '0.9rem',
              color: '#495057',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M2%204l4%204%204-4z%22%2F%3E%3C%2Fsvg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '12px'
            }}
          >
            <option>2025/2026</option>
            <option>2024/2025</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.2rem', marginLeft: '0.2rem' }}>Semester</label>
          <select 
            style={{ 
              padding: '0.5rem 2rem 0.5rem 1rem', 
              borderRadius: '4px', 
              border: '1px solid #ced4da', 
              backgroundColor: '#fff',
              fontSize: '0.9rem',
              color: '#495057',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M2%204l4%204%204-4z%22%2F%3E%3C%2Fsvg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '12px'
            }}
          >
            <option>Genap</option>
            <option>Ganjil</option>
          </select>
        </div>

        <button 
          onClick={handleSync}
          disabled={syncing}
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            color: '#495057',
            fontSize: '0.85rem',
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            alignSelf: 'flex-end',
            marginBottom: '1px'
          }}
        >
          {syncing ? 'Menyinkronkan...' : 'Sinkronisasi Ulang'}
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-muted">Memuat kelas aktif dari sistem...</div>
      ) : courses.length === 0 ? (
        <div className="p-6 text-muted" style={{ textAlign: 'center', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <p>Belum ada data matakuliah. Silakan lakukan sinkronisasi dari dashboard utama.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="card p-5"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', margin: 0, lineHeight: 1.3, flex: 1 }}>
                    {course.nama}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '4px',
                      marginLeft: '0.5rem'
                    }}
                  >
                    {course.nama.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase()}
                  </span>
                </div>
                
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#6c757d' }}>
                  {course.dosen}
                </p>

                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>
                  {course.hari}, {course.jam}
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                <Link
                  href={`/mahasiswa/kuliah/${course.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'none'
                  }}
                >
                  <span>Akses Kuliah</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
