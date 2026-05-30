'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  Video, Layers, Laptop, Globe, BookOpen,
  FileText, Book, Download, ExternalLink, Play, RefreshCw, CheckCircle,
  AlertCircle, Loader2, ArrowRight, Clock, Info
} from 'lucide-react';
import Link from 'next/link';

interface TugasItem {
  id: string;
  judul: string;
  deadline: string | null;
  status: string;
  color: string;
  mata_kuliah?: { nama: string } | null;
}

interface PengumumanItem {
  id: string;
  judul: string;
  publisher: string;
  tanggal: string;
  file_url: string | null;
}

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

// ─── Tag color same as ETHOL ──────────────────────────────────────────────────
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
  // Fallback: hash-based color from name
  let hash = 0;
  for (let i = 0; i < nama.length; i++) hash = nama.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#1779ba','#00838f','#8d6e63','#546e7a','#1565c0','#2e7d32','#6a1b9a','#e65100','#37474f','#880e4f'];
  return colors[Math.abs(hash) % colors.length];
}

export default function MahasiswaBerandaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [tugasTerbaru, setTugasTerbaru] = useState<TugasItem[]>([]);
  const [pengumuman, setPengumuman] = useState<PengumumanItem[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [semesterInfo, setSemesterInfo] = useState<string>('');
  const [carouselIdx, setCarouselIdx] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const email = encodeURIComponent(user.email || '');
      const res = await fetch(`/api/mahasiswa/beranda-data?user_id=${user.id}&email=${email}`);
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
      if (data.tugas) setTugasTerbaru(data.tugas);
      if (data.pengumuman) setPengumuman(data.pengumuman);
      if (data.lastSync) setLastSync(data.lastSync);
      if (data.semesterInfo) setSemesterInfo(data.semesterInfo);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async (isBackground = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    if (!isBackground) {
      setSyncMessage('Sedang menyinkronkan data...');
      setSyncSuccess(null);
    }
    try {
      const res = await fetch('/api/mahasiswa/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (!isBackground) {
          setSyncSuccess(true);
          setSyncMessage('Berhasil disinkronisasi!');
        }
        await fetchData();
      } else {
        if (!isBackground) {
          setSyncSuccess(false);
          setSyncMessage(`Gagal: ${data.message}`);
        }
      }
    } catch {
      if (!isBackground) {
        setSyncSuccess(false);
        setSyncMessage('Terjadi kesalahan jaringan.');
      }
    } finally {
      setIsSyncing(false);
      setTimeout(() => { setSyncMessage(''); setSyncSuccess(null); }, 8000);
    }
  };

  // Carousel: show 3 cards at a time like ETHOL
  const VISIBLE = 3;
  const maxIdx = Math.max(0, courses.length - VISIBLE);

  const menuItems = [
    { title: 'Kelas Virtual',      icon: Video,     color: '#1e88e5', bg: '#e3f2fd', href: '/mahasiswa/matakuliah' },
    { title: 'Materi Perkuliahan', icon: Layers,     color: '#f57c00', bg: '#fff3e0', href: '/mahasiswa/materi-perkuliahan' },
    { title: 'Lab Virtual',        icon: Laptop,     color: '#00897b', bg: '#e0f2f1', href: 'https://vlab.ethol.pens.ac.id/', external: true },
    { title: 'Praktikum',          icon: BookOpen,   color: '#5c6bc0', bg: '#e8eaf6', href: '/mahasiswa/praktikum' },
    { title: 'Administrasi',       icon: Globe,      color: '#e91e63', bg: '#fce4ec', href: 'https://online.mis.pens.ac.id/', external: true },
    { title: 'Perpustakaan',       icon: Book,       color: '#8bc34a', bg: '#f1f8e9', href: 'https://ebook.pens.ac.id/', external: true },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: '#0b668b', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#666', margin: 0 }}>Memuat data akademik...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: "'Roboto', sans-serif" }}>
      {/* Sync banner */}
      {syncMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '6px',
          backgroundColor: syncSuccess === true ? '#e8f5e9' : syncSuccess === false ? '#ffebee' : '#e3f2fd',
          border: `1px solid ${syncSuccess === true ? '#a5d6a7' : syncSuccess === false ? '#ef9a9a' : '#90caf9'}`,
          color: syncSuccess === true ? '#2e7d32' : syncSuccess === false ? '#c62828' : '#1565c0',
          fontSize: '0.875rem',
        }}>
          {isSyncing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : syncSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{syncMessage}</span>
        </div>
      )}

      {/* ── Kuliah Carousel ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#333', margin: 0 }}>
          {semesterInfo || 'Kuliah Semester Genap Tahun Ajaran 2025'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#999', fontStyle: 'italic' }}>
            Item dapat digeser ke kanan atau ke kiri
          </span>

        </div>
      </div>

      {courses.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem 1rem', marginBottom: '1.5rem',
          backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
        }}>
          <BookOpen size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
            Belum ada matakuliah. Klik sinkronisasi untuk memuat dari ETHOL.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          {/* Carousel container */}
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {courses.map((course) => {
              const tagBg = getTagColor(course.kode, course.nama);
              return (
                <div
                  key={course.id}
                  style={{
                    minWidth: '300px', maxWidth: '340px', flex: '0 0 auto',
                    scrollSnapAlign: 'start',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column',
                    padding: '1.25rem',
                    minHeight: '160px',
                  }}
                >
                  {/* Title row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#222', lineHeight: 1.35, flex: 1 }}>
                      {course.nama}
                    </h3>
                    <div style={{
                      minWidth: '40px', height: '34px', backgroundColor: tagBg, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '5px', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, padding: '0 6px',
                      letterSpacing: '0.5px',
                    }}>
                      {course.kode}
                    </div>
                  </div>

                  {/* Teacher */}
                  <p style={{ fontSize: '0.82rem', color: '#777', margin: '0.4rem 0 0 0' }}>
                    {course.dosen}
                  </p>

                  {/* Schedule */}
                  <p style={{ fontSize: '0.8rem', color: '#999', margin: '1rem 0 0.75rem 0' }}>
                    {course.hari !== 'Sesuai Jadwal' ? `${course.hari}, ${course.jam}` : ''}
                  </p>

                  {/* Access link */}
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

          {/* Dots */}
          {courses.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '0.75rem' }}>
              {courses.map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: idx === carouselIdx ? '#0b668b' : '#ccc',
                    display: 'inline-block', cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => setCarouselIdx(idx)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Menu ───────────────────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#333', margin: '1.5rem 0 1rem 0' }}>Menu</h2>
      <div style={{
        backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
        padding: '1.5rem', marginBottom: '2rem',
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem',
      }}>
        {menuItems.map((menu, i) => {
          const IconComp = menu.icon;
          const inner = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '50%',
                backgroundColor: menu.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: menu.color,
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
              >
                <IconComp size={28} />
              </div>
              <span style={{ fontSize: '0.8rem', color: menu.color, fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>
                {menu.title}{(menu as any).external && <ExternalLink size={9} style={{ marginLeft: 3, opacity: 0.6, verticalAlign: 'middle' }} />}
              </span>
            </div>
          );

          return (menu as any).external
            ? <a key={i} href={menu.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
            : <Link key={i} href={menu.href} style={{ textDecoration: 'none' }}>{inner}</Link>;
        })}
      </div>

      {/* ── Tugas & Pengumuman ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Tugas Terbaru */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.875rem 1.125rem', borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#fafafa',
          }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#333' }}>
              <FileText size={16} style={{ color: '#0b668b' }} /> Tugas Terbaru
            </h3>
            {tugasTerbaru.length > 0 && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.55rem', borderRadius: '10px' }}>
                {tugasTerbaru.length} Tugas
              </span>
            )}
          </div>
          <div style={{ padding: 0 }}>
            {tugasTerbaru.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <CheckCircle size={28} style={{ color: '#10B981', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Tidak ada tugas tertunda</p>
              </div>
            ) : tugasTerbaru.map((tugas, i) => (
              <div
                key={i}
                style={{
                  padding: '0.875rem 1.125rem',
                  borderBottom: i < tugasTerbaru.length - 1 ? '1px solid #f1f5f9' : 'none',
                  borderLeft: `3px solid ${tugas.color || '#0b668b'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#333' }}>{tugas.judul}</h4>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: tugas.color || '#0b668b', backgroundColor: `${tugas.color || '#0b668b'}15`, padding: '0.15rem 0.4rem', borderRadius: '4px', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {tugas.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.2rem' }}>{tugas.mata_kuliah?.nama || 'Mata Kuliah'}</p>
                {tugas.deadline && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.73rem', color: '#dc2626', fontWeight: 500 }}>
                    <Clock size={11} />
                    {new Date(tugas.deadline).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/mahasiswa/tugas-online"
            style={{
              display: 'block', textAlign: 'center', padding: '0.7rem',
              borderTop: '1px solid #e2e8f0', backgroundColor: '#fafafa',
              fontSize: '0.8rem', fontWeight: 600, color: '#0b668b', textDecoration: 'none',
            }}
          >
            Lihat Semua Tugas
          </Link>
        </div>

        {/* Pengumuman */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.875rem 1.125rem', borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#fafafa',
          }}>
            <Info size={16} style={{ color: '#0b668b' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>Pengumuman</h3>
          </div>
          <div style={{ padding: 0 }}>
            {pengumuman.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <Book size={28} style={{ color: '#94a3b8', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Tidak ada pengumuman</p>
              </div>
            ) : pengumuman.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '0.875rem 1.125rem',
                  borderBottom: i < pengumuman.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#333' }}>{p.judul}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: 0 }}>
                    {p.publisher} · {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {p.file_url && (
                    <a href={p.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0b668b', fontSize: '0.73rem', fontWeight: 600, textDecoration: 'none' }}>
                      <Download size={11} /> Unduh
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
