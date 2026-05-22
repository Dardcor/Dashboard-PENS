'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import {
  Award,
  BookOpen,
  Clock,
  GraduationCap,
  Video,
  Layers,
  Laptop,
  Globe,
  FileText,
  Book,
  Download,
  ExternalLink,
  X,
  Play
} from 'lucide-react';
import type { RingkasanMahasiswa } from '../../../../lib/types';

export default function MahasiswaBerandaPage() {
  const { user } = useAuth();
  const [mhs, setMhs] = useState<RingkasanMahasiswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVirtualModalOpen, setIsVirtualModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'KULIAH' | 'UMUM'>('KULIAH');
  const [selectedRoom, setSelectedRoom] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const { data: mhsSelfData, error: mhsSelfError } = await supabase
          .from('v_ringkasan_mahasiswa')
          .select('*')
          .limit(1)
          .single();

        if (mhsSelfError && mhsSelfError.code !== 'PGRST116') {
          console.warn('Could not fetch mahasiswa details:', mhsSelfError);
        } else if (mhsSelfData) {
          setMhs(mhsSelfData as RingkasanMahasiswa);
        }
      } catch (error) {
        console.error('Error fetching mahasiswa data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const statCards = [
    { title: 'IPK Kumulatif', value: mhs?.ipk_kumulatif ? mhs.ipk_kumulatif.toFixed(2) : '3.72', icon: Award, color: '#3b82f6' },
    { title: 'IPS Terakhir', value: mhs?.ips_terakhir ? mhs.ips_terakhir.toFixed(2) : '3.80', icon: GraduationCap, color: '#10b981' },
    { title: 'SKS Kumulatif', value: mhs?.sks_kumulatif ? mhs.sks_kumulatif : '108', icon: BookOpen, color: '#f59e0b' },
    { title: 'Rata-rata Kehadiran', value: mhs?.avg_kehadiran ? `${mhs.avg_kehadiran}%` : '98.5%', icon: Clock, color: '#ef4444' },
  ];

  const gridMenus = [
    {
      title: 'Kelas Virtual',
      desc: 'Ikuti perkuliahan aktif online',
      icon: Video,
      color: '#3b82f6',
      action: () => setIsVirtualModalOpen(true),
    },
    {
      title: 'Materi Perkuliahan',
      desc: 'Download modul kuliah',
      icon: BookOpen,
      color: '#10b981',
      href: '/mahasiswa/materi-perkuliahan',
    },
    {
      title: 'Lab Virtual',
      desc: 'Konsol praktikum cloud vLAB PENS',
      icon: Laptop,
      color: '#8b5cf6',
      href: 'https://vlab.ethol.pens.ac.id/',
      external: true,
    },
    {
      title: 'Praktikum',
      desc: 'Modul w3schools & IDE pemrograman',
      icon: Layers,
      color: '#ec4899',
      href: '/mahasiswa/praktikum',
    },
    {
      title: 'Administrasi',
      desc: 'PENS Online MIS akademik',
      icon: Globe,
      color: '#f59e0b',
      href: 'https://online.mis.pens.ac.id/',
      external: true,
    },
    {
      title: 'Perpustakaan',
      desc: 'EEPIS E-book library system',
      icon: Book,
      color: '#ef4444',
      href: 'https://ebook.pens.ac.id/',
      external: true,
    },
  ];

  const tugasTerbaru = [
    {
      title: 'Versi Final Rancangan Aplikasi TBC',
      matkul: 'Proposal Proyek Akhir',
      deadline: 'Senin, 11 Mei 2026 - 09:00',
      status: 'Belum mengumpulkan',
      color: '#ef4444',
    },
    {
      title: 'Tugas 2 : Logika Fuzzy (Report)',
      matkul: 'Kecerdasan Buatan',
      deadline: 'Rabu, 06 Mei 2026 - 21:00',
      status: 'Mengumpulkan: Rabu, 06 Mei 2026 - 14:10',
      color: '#10b981',
    },
  ];

  const pengumuman = [
    {
      title: 'Pengumuman calon wisuda April 2020',
      publisher: 'BAAK',
      date: 'Kamis, 19 Maret 2020',
      file: 'IMG-20200319-WA0039.jpg',
    },
    {
      title: 'Pengumuman Jadwal UAS Program D4 LJ-PJJ Poltekbang Semester Genap 2019-2020',
      publisher: 'BAAK',
      date: 'Rabu, 20 Mei 2020',
      file: 'Jdwl UAS PJJ Genap 2018-2019 Polbang.xls',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div
        className="card mb-6"
        style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '2rem',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {mhs?.nama_lengkap?.charAt(0) || 'S'}
        </div>
        <div>
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: '0.5rem',
            }}
          >
            Mahasiswa PENS
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            {mhs?.nama_lengkap || 'Syahrul Ardi Prasetiyo'}
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            NRP {mhs?.nrp || '2110181044'} &bull; {mhs?.kelas || '6 D3 IT kelas'} &bull; {mhs?.prodi || 'D3 Teknik Informatika'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, i) => (
          <div key={i} className="card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: `${stat.color}12`,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {stat.title}
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.25rem 0 0 0' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
          Pintasan Menu Utama
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {gridMenus.map((menu, i) => {
            const CardBody = (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: `${menu.color}15`,
                    color: menu.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <menu.icon size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {menu.title} {menu.external && <ExternalLink size={12} />}
                  </h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.15rem 0 0 0' }}>
                    {menu.desc}
                  </p>
                </div>
              </div>
            );

            if (menu.action) {
              return (
                <button
                  key={i}
                  onClick={menu.action}
                  className="card p-5"
                  style={{ width: '100%', background: 'none', border: '1px solid var(--color-border)' }}
                >
                  {CardBody}
                </button>
              );
            }

            if (menu.external) {
              return (
                <a
                  key={i}
                  href={menu.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card p-5"
                  style={{ textDecoration: 'none' }}
                >
                  {CardBody}
                </a>
              );
            }

            return (
              <a
                key={i}
                href={menu.href}
                className="card p-5"
                style={{ textDecoration: 'none' }}
              >
                {CardBody}
              </a>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Tugas Terbaru
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              2 Tugas Aktif
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {tugasTerbaru.map((tugas, i) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderLeft: `4px solid ${tugas.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                    {tugas.title}
                  </h4>
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.25rem 0' }}>
                  Mata Kuliah: {tugas.matkul}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Deadline: {tugas.deadline}
                  </span>
                  <span style={{ fontWeight: 600, color: tugas.color }}>
                    {tugas.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Pengumuman BAAK PENS
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              Pengumuman Terbaru
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {pengumuman.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.4 }}>
                  {p.title}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span>
                    Oleh: {p.publisher} &bull; {p.date}
                  </span>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: 600,
                    }}
                  >
                    <Download size={12} />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isVirtualModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card animate-scale-in"
            style={{
              width: '500px',
              maxWidth: '90%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setIsVirtualModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 1.25rem 0' }}>
              Kelas Virtual
            </h3>

            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid var(--color-border)',
                marginBottom: '1.5rem',
              }}
            >
              {(['KULIAH', 'UMUM'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none',
                    color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: '-2px',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'KULIAH' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Untuk masuk ke Ruang Kuliah Virtual, silakan pilih Mata Kuliah aktif Anda di halaman <strong>Matakuliah</strong> lalu klik <strong>Akses Kuliah</strong>.
                </p>
                <a
                  href="/mahasiswa/matakuliah"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                >
                  Buka Halaman Matakuliah
                </a>
              </div>
            ) : (
              <div>
                <div className="form-group mb-4">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Pilih Ruangan Virtual
                  </label>
                  <select
                    className="form-control"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="">-- Pilih Ruangan --</option>
                    <option value="hall-d3it">Ruang Sidang D3 IT</option>
                    <option value="lab-db">Ruang Lab Basis Data</option>
                    <option value="lab-network">Ruang Lab Jaringan Komputer</option>
                  </select>
                </div>
                <button
                  disabled={!selectedRoom}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Play size={16} />
                  Masuk Ruangan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
