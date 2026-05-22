'use client';

import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Clock, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import type { RingkasanMahasiswa, NilaiPerSemester } from '../../../lib/types';
import type { LucideIcon } from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export default function MahasiswaDashboardPage() {
  const { user } = useAuth();
  const [mhs, setMhs] = useState<RingkasanMahasiswa | null>(null);
  const [nilaiSemesterData, setNilaiSemesterData] = useState<NilaiPerSemester[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // RLS filters automatically to current user's mahasiswa row
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

        const { data: nilaiData, error: nilaiError } = await supabase
          .from('v_nilai_per_semester')
          .select('*');
        if (nilaiError) throw nilaiError;
        setNilaiSemesterData(nilaiData ?? []);
      } catch (error) {
        console.error('Error fetching mahasiswa data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="p-6 text-muted">Memuat data dashboard...</div>;
  }

  if (!mhs) {
    return (
      <div className="p-6 text-center">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Data Mahasiswa Tidak Ditemukan</h2>
        <p className="text-muted">Pastikan akun Anda terhubung dengan data akademik yang valid.</p>
      </div>
    );
  }

  const statCards: StatCard[] = [
    { title: 'IPK Kumulatif',      value: (mhs.ipk_kumulatif  ?? 0).toFixed(2), icon: Award,         color: 'var(--color-primary)' },
    { title: 'IPS Terakhir',       value: (mhs.ips_terakhir   ?? 0).toFixed(2), icon: GraduationCap, color: 'var(--color-success)' },
    { title: 'SKS Kumulatif',      value:  mhs.sks_kumulatif  ?? 0,             icon: BookOpen,      color: 'var(--color-warning)' },
    { title: 'Rata-rata Kehadiran',value: `${mhs.avg_kehadiran ?? 0}%`,         icon: Clock,         color: 'var(--color-danger)'  },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Halo, {mhs.nama_lengkap}!</h1>
        <p className="text-muted">Pantau terus perkembangan akademik Anda di sini.</p>
      </div>

      {/* Dosen Wali Card */}
      <div
        className="card mb-6"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>Dosen Wali</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {mhs.dosen_wali_nama || 'Belum diatur'}
            </h2>
          </div>
          <button className="btn" style={{ backgroundColor: 'white', color: 'var(--color-primary)' }}>
            Buat Janji Konsultasi
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: `${stat.color}15`,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                {stat.title}
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Nilai Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Nilai Semester Terakhir</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>SKS</th>
                <th>Nilai Akhir</th>
                <th>Grade</th>
                <th>Bobot</th>
              </tr>
            </thead>
            <tbody>
              {nilaiSemesterData.map((nilai, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 500 }}>{nilai.nama_matkul}</td>
                  <td>{nilai.sks}</td>
                  <td>{nilai.nilai_akhir}</td>
                  <td>
                    <span
                      className={`badge ${
                        ['A', 'AB'].includes(nilai.grade) ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {nilai.grade}
                    </span>
                  </td>
                  <td>{(nilai.bobot_nilai ?? 0).toFixed(2)}</td>
                </tr>
              ))}
              {nilaiSemesterData.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                    Belum ada data nilai untuk ditampilkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
