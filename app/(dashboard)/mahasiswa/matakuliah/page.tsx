'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { BookOpen, User, Calendar, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
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
              kode: mk.kode || 'MK'
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

  const handleSync = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setSyncing(true);
    try {
      const res = await fetch('/api/mahasiswa/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) {
        await loadLocalCourses();
      } else if (!isSilent) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Gagal sinkronisasi data dari ETHOL");
      }
    } catch (e: any) {
      console.error(e);
      if (!isSilent) alert(`Terjadi kesalahan sistem: ${e.message || e}`);
    } finally {
      if (!isSilent) setSyncing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initPage() {
      if (!user) return;
      setLoading(true);
      await loadLocalCourses();
      if (isMounted) setLoading(false);

      // Auto background sync on page load to pull real-time data automatically
      try {
        await handleSync(true);
      } catch (e) {
        console.error(e);
      }
    }
    initPage();
    return () => { isMounted = false; };
  }, [user]);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      {/* Dropdown Filters matching ETHOL */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
          onClick={() => handleSync(false)}
          disabled={syncing}
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1.25rem',
            backgroundColor: '#fff',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            color: '#495057',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            alignSelf: 'flex-end',
            marginBottom: '1px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {syncing ? <Loader2 size={14} className="spin-icon" /> : <RefreshCw size={14} style={{ color: 'var(--color-primary)' }} />}
          <span>{syncing ? 'Menyinkronkan...' : 'Sinkronisasi Ulang'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 size={28} className="spin-icon" style={{ color: 'var(--color-primary)' }} />
          <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>Memuat kelas aktif dari sistem...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-8 text-muted" style={{ textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <BookOpen size={40} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500, color: '#64748b' }}>Belum ada data matakuliah.</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Silakan lakukan sinkronisasi ulang untuk menarik data matakuliah terbaru dari ETHOL.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {courses.map((course) => {
            // Map tag initials color identical to ETHOL Gambar 2
            let tagBg = '#1779ba';
            const code = course.kode || course.nama.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
            const upperCode = code.toUpperCase();
            
            if (upperCode === 'WPF') tagBg = '#1779ba'; // Blue
            else if (upperCode === 'WDP') tagBg = '#00838f'; // Teal
            else if (upperCode === 'PPA') tagBg = '#8d6e63'; // Brown
            else if (upperCode === 'BI') tagBg = '#455a64'; // Grey Blue
            else if (upperCode === 'WAD') tagBg = '#4caf50'; // Green
            else if (upperCode === 'WAB') tagBg = '#1565c0'; // Dark Blue
            
            return (
              <div
                key={course.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem',
                  position: 'relative',
                  minHeight: '200px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#333', margin: 0, lineHeight: 1.3, flex: 1 }}>
                      {course.nama}
                    </h3>
                    <div style={{
                      width: '42px', height: '42px', backgroundColor: tagBg, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0
                    }}>
                      {code}
                    </div>
                  </div>
                  
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>
                    {course.dosen}
                  </p>

                  <p style={{ margin: '1.5rem 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                    {course.hari !== 'Sesuai Jadwal' ? `${course.hari}, ${course.jam}` : 'Jadwal belum ditentukan'}
                  </p>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <Link
                    href={`/mahasiswa/kuliah/${course.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#1779ba',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textDecoration: 'none'
                    }}
                  >
                    <span>Akses Kuliah</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
