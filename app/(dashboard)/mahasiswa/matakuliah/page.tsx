'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { BookOpen, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
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

// ─── Tag color matching ETHOL colors ──────────────────────────────────────────
function getTagColor(kode: string, nama: string): string {
  const k = kode.toUpperCase();
  const n = nama.toUpperCase();
  if (k === 'WPF' || n.includes('PEMROGRAMAN FRAMEWORK')) return '#1779ba';
  if (k === 'WDP' || n.includes('DESAIN PENGALAMAN') || n.includes('UX')) return '#00838f';
  if (k === 'PPA' || n.includes('PROYEK AKHIR') || n.includes('PROPOSAL')) return '#8d6e63';
  if (k === 'WAJ' || n.includes('JARINGAN')) return '#546e7a';
  if (k === 'WAB' || n.includes('BASIS DATA') || n.includes('DATABASE')) return '#1565c0';
  if (k === 'WAK' || n.includes('KOMPUTASI AWAN') || n.includes('CLOUD')) return '#2e7d32';
  if (k === 'WPB' || n.includes('PERANGKAT BERGERAK') || n.includes('MOBILE')) return '#6a1b9a';
  if (k === 'WAG' || n.includes('AGILE')) return '#e65100';
  if (k === 'PKB' || k === 'PRA' || n.includes('KECERDASAN BUATAN') || n.includes('AI')) return '#37474f';
  if (k === 'BI' || n.includes('BAHASA INDONESIA')) return '#4e342e';
  if (k === 'PKA' || n.includes('PRAKTEK') || n.includes('PRAKTIK')) return '#880e4f';
  // Fallback: hash-based color
  let hash = 0;
  for (let i = 0; i < nama.length; i++) hash = nama.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#1779ba', '#00838f', '#8d6e63', '#546e7a', '#1565c0', '#2e7d32', '#6a1b9a', '#e65100', '#37474f', '#880e4f'];
  return colors[Math.abs(hash) % colors.length];
}

export default function MahasiswaMatakuliahPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTahun, setSelectedTahun] = useState('2025/2026');
  const [selectedSemester, setSelectedSemester] = useState('Genap');

  const loadCourses = async () => {
    if (!user) return;
    try {
      const email = encodeURIComponent(user.email || '');
      const res = await fetch(`/api/mahasiswa/matakuliah-data?user_id=${user.id}&email=${email}`);
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (e) {
      console.error(e);
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
        await loadCourses();
      } else if (!isSilent) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Gagal sinkronisasi data dari ETHOL');
      }
    } catch (e: any) {
      if (!isSilent) alert(`Terjadi kesalahan: ${e.message || e}`);
    } finally {
      if (!isSilent) setSyncing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!user) return;
      setLoading(true);
      await loadCourses();
      if (mounted) setLoading(false);
    }
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div style={{ padding: '1.5rem', fontFamily: "'Roboto', sans-serif" }}>
      {/* ── Filter bar exactly like ETHOL ─────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '1.5rem',
        alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>
            Tahun Ajaran
          </label>
          <select
            value={selectedTahun}
            onChange={e => setSelectedTahun(e.target.value)}
            style={{
              padding: '0.45rem 2rem 0.45rem 0.75rem',
              borderRadius: '4px', border: '1px solid #ced4da',
              backgroundColor: '#fff', fontSize: '0.875rem', color: '#495057',
              appearance: 'none', cursor: 'pointer',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23555\' d=\'M2 4l4 4 4-4z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center',
              backgroundSize: '10px',
            }}
          >
            <option>2025/2026</option>
            <option>2024/2025</option>
            <option>2023/2024</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>
            Semester
          </label>
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            style={{
              padding: '0.45rem 2rem 0.45rem 0.75rem',
              borderRadius: '4px', border: '1px solid #ced4da',
              backgroundColor: '#fff', fontSize: '0.875rem', color: '#495057',
              appearance: 'none', cursor: 'pointer',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23555\' d=\'M2 4l4 4 4-4z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center',
              backgroundSize: '10px',
            }}
          >
            <option>Genap</option>
            <option>Ganjil</option>
          </select>
        </div>


      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 size={28} style={{ color: '#0b668b', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6c757d', fontSize: '0.9rem', margin: 0 }}>Memuat kelas aktif dari sistem...</p>
        </div>
      ) : courses.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 1rem',
          backgroundColor: '#fff', borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}>
          <BookOpen size={40} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500, color: '#64748b' }}>
            Belum ada data matakuliah.
          </p>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Silakan lakukan sinkronisasi ulang untuk menarik data matakuliah terbaru dari ETHOL.
          </p>
        </div>
      ) : (
        /* ── Course Cards Grid (same as ETHOL layout) ────────────────────── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.25rem',
        }}>
          {courses.map((course) => {
            const tagBg = getTagColor(course.kode, course.nama);
            return (
              <div
                key={course.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.25rem',
                  minHeight: '170px',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Title + tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                  <h3 style={{
                    fontSize: '1rem', fontWeight: 700, margin: 0,
                    color: '#222', lineHeight: 1.4, flex: 1,
                  }}>
                    {course.nama}
                  </h3>
                  <div style={{
                    minWidth: '38px', height: '32px',
                    backgroundColor: tagBg, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                    flexShrink: 0, padding: '0 5px', letterSpacing: '0.5px',
                  }}>
                    {course.kode}
                  </div>
                </div>

                {/* Teacher */}
                <p style={{ fontSize: '0.83rem', color: '#777', margin: '0.4rem 0 0 0' }}>
                  {course.dosen}
                </p>

                {/* Schedule */}
                <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '1rem 0 0.75rem 0', minHeight: '1.2em' }}>
                  {course.hari !== 'Sesuai Jadwal' && course.jam !== 'Sesuai Jadwal'
                    ? `${course.hari}, ${course.jam}`
                    : ''}
                </p>

                {/* Akses Kuliah */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <Link
                    href={`/mahasiswa/kuliah/${course.id}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      color: '#1779ba', fontWeight: 600, fontSize: '0.875rem',
                      textDecoration: 'none',
                    }}
                  >
                    Akses Kuliah <ArrowRight size={14} />
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
