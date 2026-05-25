'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Award, BookOpen, FileText, CheckCircle } from 'lucide-react';
import type { NilaiPerSemester } from '../../../../lib/types';

interface SemesterSummary {
  ips: number;
  ipk: number;
  sksSemester: number;
  sksKumulatif: number;
}

export default function MahasiswaNilaiPage() {
  const { user } = useAuth();
  const [nilaiList, setNilaiList] = useState<NilaiPerSemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('Genap 2025');

  // State for grades

  useEffect(() => {
    async function fetchGrades() {
      if (!user) return;
      try {
        const { data: supaNilai, error } = await supabase
          .from('v_nilai_per_semester')
          .select('*');

        if (!error && supaNilai && supaNilai.length > 0) {
          setNilaiList(supaNilai as NilaiPerSemester[]);
        } else {
          setNilaiList([]);
        }
      } catch (e) {
        console.error(e);
        setNilaiList([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGrades();
  }, [user]);

  const totalSks = nilaiList.reduce((sum, n) => sum + (n.sks || 0), 0);
  const totalBobotSks = nilaiList.reduce((sum, n) => sum + ((n.bobot_nilai || 0) * (n.sks || 0)), 0);
  const calculatedIps = totalSks > 0 ? Number((totalBobotSks / totalSks).toFixed(2)) : 0.00;

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Nilai Akademik & Transkrip
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Tinjau rangkuman nilai per semester, bobot kelulusan, dan pencapaian Indeks Prestasi Anda.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="card p-4" style={{ border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Pilih Semester Akademik
          </label>
          <select
            className="form-control"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
          >
            <option value="Genap 2025">Semester Genap 2025/2026</option>
            <option value="Ganjil 2024">Semester Ganjil 2024/2025</option>
          </select>
        </div>

        <div className="card p-5" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
              Indeks Prestasi Semester (IPS)
            </p>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.15rem 0 0 0' }}>
              {calculatedIps.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card p-5" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
              SKS Tempuh Semester
            </p>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.15rem 0 0 0' }}>
              {totalSks} SKS
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Rincian Transkrip Mata Kuliah</h2>
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
                <th>Status Kelulusan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                    Memuat data nilai akademik...
                  </td>
                </tr>
              ) : nilaiList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
                    Belum ada data nilai. Silakan lakukan sinkronisasi dari dashboard utama.
                  </td>
                </tr>
              ) : (
                nilaiList.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.nama_matkul}</td>
                    <td>{row.sks}</td>
                    <td>{row.nilai_akhir ? row.nilai_akhir.toFixed(1) : '85.0'}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          backgroundColor: ['A', 'AB', 'B'].includes(row.grade) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: ['A', 'AB', 'B'].includes(row.grade) ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {row.grade}
                      </span>
                    </td>
                    <td>{(row.bobot_nilai ?? 4).toFixed(2)}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#10b981',
                        }}
                      >
                        <CheckCircle size={14} />
                        Lulus
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
