'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { useRealtime } from '../../../../context/RealtimeContext';
import { useNotifications } from '../../../../context/NotificationContext';
import {
  Video, Layers, Laptop, Globe, BookOpen, User, MapPin,
  FileText, Book, Download, ExternalLink, Play, RefreshCw, CheckCircle,
  AlertCircle, Loader2, ArrowRight, ChevronRight, ChevronLeft, Calendar, Clock, Activity, Bell
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

interface SyncStats {
  nilai?: number;
  kehadiran?: number;
  tugas?: number;
  pengumuman?: number;
}

export default function MahasiswaBerandaPage() {
  const { user } = useAuth();
  const { nilaiChanges, kehadiranChanges, alertBaru, ipkUpdates } = useRealtime();
  const { lastEvent, wsConnectionState } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats>({});

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [tugasTerbaru, setTugasTerbaru] = useState<TugasItem[]>([]);
  const [pengumuman, setPengumuman] = useState<PengumumanItem[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [semesterInfo, setSemesterInfo] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: mhs } = await supabase.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
      if (!mhs) return;

      const [supaKehadiran, tugasRes, pengumumanRes, sess, sem] = await Promise.all([
        supabase.from('kehadiran').select('mata_kuliah:mata_kuliah_id(id, nama, kode, sks)').eq('mahasiswa_id', mhs.id),
        supabase.from('tugas').select('*, mata_kuliah(nama)').eq('mahasiswa_id', mhs.id).order('deadline', { ascending: true }).limit(4),
        supabase.from('pengumuman').select('id,judul,publisher,tanggal,file_url').order('tanggal', { ascending: false }).limit(4),
        supabase.from('user_ethol_sessions').select('last_sync_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('semester').select('nama').eq('is_aktif', true).maybeSingle(),
      ]);

      if (supaKehadiran && supaKehadiran.data && supaKehadiran.data.length > 0) {
        const uniqueCourses = new Map();
        for (const k of supaKehadiran.data) {
          const mk = k.mata_kuliah as any;
          if (mk && !uniqueCourses.has(mk.id)) {
            uniqueCourses.set(mk.id, {
              id: mk.id, nama: mk.nama, dosen: 'Dosen Pengampu',
              sks: mk.sks ?? 3, hari: 'Sesuai Jadwal',
              jam: 'Sesuai Jadwal', ruang: 'Kelas Virtual / Offline',
              kode: mk.kode || 'MK-PENS'
            });
          }
        }
        setCourses(Array.from(uniqueCourses.values()));
      }

      if (tugasRes.data) setTugasTerbaru(tugasRes.data as TugasItem[]);
      if (pengumumanRes.data) setPengumuman(pengumumanRes.data as PengumumanItem[]);
      if (sess.data?.last_sync_at) setLastSync(sess.data.last_sync_at);
      if (sem.data) setSemesterInfo(sem.data.nama);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Sedang menyinkronkan data...');
    setSyncSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mahasiswa/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSyncSuccess(true);
        setSyncMessage('Berhasil disinkronisasi!');
        setSyncStats(data.stats || {});
        await fetchData();
      } else {
        setSyncSuccess(false);
        setSyncMessage(`Gagal: ${data.message}`);
      }
    } catch {
      setSyncSuccess(false);
      setSyncMessage('Terjadi kesalahan jaringan.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => { setSyncMessage(''); setSyncSuccess(null); setSyncStats({}); }, 8000);
    }
  };

  const totalLiveChanges = nilaiChanges.length + kehadiranChanges.length + ipkUpdates.length;
  const hasLiveActivity = totalLiveChanges > 0 || alertBaru.length > 0;

  const gridMenus = [
    { title: 'Kelas Virtual', icon: Video, color: '#0C6B94', href: '/mahasiswa/matakuliah' },
    { title: 'Materi Perkuliahan', icon: Layers, color: '#F59E0B', href: '/mahasiswa/materi-perkuliahan' },
    { title: 'Lab Virtual', icon: Laptop, color: '#10B981', href: 'https://vlab.ethol.pens.ac.id/', external: true },
    { title: 'Praktikum', icon: BookOpen, color: '#8B5CF6', href: '/mahasiswa/praktikum' },
    { title: 'Administrasi', icon: Globe, color: '#EF4444', href: 'https://online.mis.pens.ac.id/', external: true },
    { title: 'Perpustakaan', icon: Book, color: '#6366F1', href: 'https://ebook.pens.ac.id/', external: true },
    { title: 'Ujian Online', icon: FileText, color: '#14B8A6', href: '/mahasiswa/ujian-online' },
    { title: 'Video Pembelajaran', icon: Play, color: '#EC4899', href: '/mahasiswa/video' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
        <p className="text-muted">Memuat data akademik...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in dashboard-page">
      {/* Sync Banner */}
      {syncMessage && (
        <div className={`sync-banner ${syncSuccess === true ? 'sync-success' : syncSuccess === false ? 'sync-error' : 'sync-loading'}`}>
          {isSyncing ? <Loader2 size={16} className="spin-icon" /> : syncSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Live Activity Banner */}
      {hasLiveActivity && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          flexWrap: 'wrap', fontSize: '0.85rem',
        }}>
          <Activity size={16} style={{ color: '#10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontWeight: 600, color: '#10b981' }}>Data Real-time:</span>
          {kehadiranChanges.length > 0 && <span className="badge badge-success">{kehadiranChanges.length} update kehadiran</span>}
          {nilaiChanges.length > 0 && <span className="badge badge-warning">{nilaiChanges.length} update nilai</span>}
          {ipkUpdates.length > 0 && <span className="badge badge-primary">{ipkUpdates.length} update IPK</span>}
          {alertBaru.length > 0 && <span className="badge badge-danger">{alertBaru.length} alert baru</span>}
          {lastEvent && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
              Event terakhir: {lastEvent.type} ({lastEvent.time.toLocaleTimeString('id-ID')})
            </span>
          )}
        </div>
      )}

      {/* Header with Sync Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>{semesterInfo || 'Semester Aktif'}</h2>
          {lastSync && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Update terakhir: {new Date(lastSync).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button 
          onClick={handleSync} 
          disabled={isSyncing} 
          className="btn"
          style={{ 
            backgroundColor: 'white', 
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            boxShadow: 'var(--shadow-sm)',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          {isSyncing ? <Loader2 size={15} className="spin-icon" /> : <RefreshCw size={15} style={{ color: 'var(--color-primary)' }} />}
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ETHOL'}</span>
        </button>
      </div>

      {/* Courses Carousel / Grid */}
      {courses.length === 0 ? (
        <div className="card p-6 mb-8 text-center text-muted" style={{ borderStyle: 'dashed' }}>
          <BookOpen size={32} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
          <p>Belum ada matakuliah. Klik sinkronisasi untuk memuat dari ETHOL.</p>
        </div>
      ) : (
        <div className="mb-8" style={{
          display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem',
          scrollSnapType: 'x mandatory', msOverflowStyle: 'none', scrollbarWidth: 'none'
        }}>
          {courses.map((course) => (
            <div key={course.id} className="card" style={{
              minWidth: '320px', maxWidth: '350px', flex: '0 0 auto', scrollSnapAlign: 'start',
              borderTop: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {course.kode} &bull; {course.sks} SKS
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.75rem 0', lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
                  {course.nama}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} /> {course.dosen}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> {course.hari}, {course.jam}</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-background)', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
                <Link href={`/mahasiswa/kuliah/${course.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                  Akses Kelas <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Menu Grid */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Menu</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '2rem'
      }}>
        {gridMenus.map((menu, i) => {
          const content = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '50%', 
                backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: menu.color, border: '1px solid var(--color-border)'
              }}>
                <menu.icon size={28} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                {menu.title} {menu.external && <ExternalLink size={10} style={{ display: 'inline', opacity: 0.5 }} />}
              </span>
            </div>
          );
          if (menu.external) {
            return <a key={i} href={menu.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>{content}</a>;
          }
          return <Link key={i} href={menu.href} style={{ textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>{content}</Link>;
        })}
      </div>

      {/* Live Changes Summary Card */}
      {totalLiveChanges > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--color-primary)' }} /> Perubahan Real-time
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {kehadiranChanges.slice(0, 3).map((k, i) => (
              <div key={`k-${i}`} className="card" style={{ padding: '0.75rem', borderLeft: '4px solid #10b981' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>
                  Kehadiran: {k.persentase_kehadiran}%
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Hadir {k.hadir}/{k.total_pertemuan} pertemuan
                </p>
              </div>
            ))}
            {nilaiChanges.slice(0, 3).map((n, i) => (
              <div key={`n-${i}`} className="card" style={{ padding: '0.75rem', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>
                  Nilai: {n.grade} ({n.nilai_akhir})
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Update terbaru
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tugas & Pengumuman */}
      <div className="two-col-grid">
        {/* Tugas */}
        <div className="card">
          <div className="card-header" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface)' }}>
            <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Tugas Terbaru
            </h3>
            {tugasTerbaru.length > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>{tugasTerbaru.length} Tugas</span>}
          </div>
          <div style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
            {tugasTerbaru.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <CheckCircle size={32} style={{ color: '#10B981', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>Tidak ada tugas yang tertunda</p>
              </div>
            ) : tugasTerbaru.map((tugas, i) => (
              <div key={i} style={{ padding: '1rem 1.25rem', borderBottom: i < tugasTerbaru.length - 1 ? '1px solid var(--color-border)' : 'none', borderLeft: `3px solid ${tugas.color || 'var(--color-primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{tugas.judul}</h4>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: tugas.color || 'var(--color-primary)', backgroundColor: `${tugas.color}15` || 'var(--color-primary-light)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{tugas.status}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>{tugas.mata_kuliah?.nama || 'Mata Kuliah'}</p>
                {tugas.deadline && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#DC2626', fontWeight: 500 }}>
                    <Clock size={12} /> {new Date(tugas.deadline).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link href="/mahasiswa/tugas-online" style={{ display: 'block', textAlign: 'center', padding: '0.75rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
            Lihat Semua Tugas
          </Link>
        </div>

        {/* Pengumuman */}
        <div className="card">
          <div className="card-header" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface)' }}>
            <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: 'var(--color-primary)' }} /> Pengumuman
            </h3>
          </div>
          <div style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
            {pengumuman.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <Book size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>Tidak ada pengumuman</p>
              </div>
            ) : pengumuman.map((p, i) => (
              <div key={i} style={{ padding: '1rem 1.25rem', borderBottom: i < pengumuman.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.judul}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    {p.publisher} &bull; {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {p.file_url && (
                    <a href={p.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                      <Download size={12} /> Unduh
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
