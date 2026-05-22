'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Calendar, User, Clock, CheckCircle } from 'lucide-react';
import type { KehadiranPerMatkul } from '../../../../lib/types';

export default function MahasiswaKehadiranPage() {
  const { user } = useAuth();
  const [kehadiranList, setKehadiranList] = useState<KehadiranPerMatkul[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('Genap 2025');

  const fallbackKehadiran: KehadiranPerMatkul[] = [
    { nama_matkul: 'Workshop Pemrograman Framework', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Workshop Desain Pengalaman Pengguna', total_pertemuan: 14, hadir: 13, alpha: 1, persentase: 92.86 },
    { nama_matkul: 'Proposal Proyek Akhir', total_pertemuan: 12, hadir: 12, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Bahasa Indonesia', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Workshop Aplikasi dan Komputasi Awan', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Workshop Administrasi Jaringan', total_pertemuan: 14, hadir: 13, alpha: 1, persentase: 92.86 },
    { nama_matkul: 'Workshop Administrasi Basis Data', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Workshop Pemrograman Perangkat Bergerak', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Kecerdasan Buatan', total_pertemuan: 14, hadir: 13, alpha: 1, persentase: 92.86 },
    { nama_matkul: 'Praktek Kecerdasan Buatan', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 },
    { nama_matkul: 'Workshop Pengembangan Perangkat Lunak berbasis Agile', total_pertemuan: 14, hadir: 14, alpha: 0, persentase: 100.00 }
  ];

  useEffect(() => {
    async function fetchAttendance() {
      if (!user) return;
      try {
        const { data: supaKehadiran, error } = await supabase
          .from('v_kehadiran_per_matkul')
          .select('*');

        if (!error && supaKehadiran && supaKehadiran.length > 0) {
          setKehadiranList(supaKehadiran as KehadiranPerMatkul[]);
        } else {
          setKehadiranList(fallbackKehadiran);
        }
      } catch (e) {
        console.error(e);
        setKehadiranList(fallbackKehadiran);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, [user]);

  const totalHadir = kehadiranList.reduce((sum, k) => sum + (k.hadir || 0), 0);
  const totalAlpha = kehadiranList.reduce((sum, k) => sum + (k.alpha || 0), 0);
  const totalPertemuan = kehadiranList.reduce((sum, k) => sum + (k.total_pertemuan || 0), 0);
  const averagePercentage = totalPertemuan > 0 ? Number(((totalHadir / totalPertemuan) * 100).toFixed(2)) : 0;

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Kehadiran Presensi
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Tinjau persentase absensi harian dan akumulasi kehadiran tatap muka kuliah.
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
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
              Persentase Rata-rata Kehadiran
            </p>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', margin: '0.15rem 0 0 0' }}>
              {averagePercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="card p-5" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
              Akumulasi Ketidakhadiran (Alpha)
            </p>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444', margin: '0.15rem 0 0 0' }}>
              {totalAlpha} Pertemuan
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Absensi Kehadiran per Mata Kuliah</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>Total Pertemuan</th>
                <th>Hadir</th>
                <th>Alpha</th>
                <th>Persentase Kehadiran</th>
                <th>Batas Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                    Memuat data absensi...
                  </td>
                </tr>
              ) : (
                kehadiranList.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.nama_matkul}</td>
                    <td>{row.total_pertemuan}</td>
                    <td>{row.hadir}</td>
                    <td>
                      <span style={{ color: row.alpha > 0 ? '#ef4444' : 'inherit', fontWeight: row.alpha > 0 ? 600 : 'normal' }}>
                        {row.alpha}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, height: '6px', width: '100px', backgroundColor: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${row.persentase}%`,
                              backgroundColor: (row.persentase || 0) >= 80 ? '#10b981' : '#ef4444',
                              borderRadius: '99px',
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: (row.persentase || 0) >= 80 ? '#10b981' : '#ef4444' }}>
                          {(row.persentase || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: (row.persentase || 0) >= 80 ? '#10b981' : '#ef4444',
                        }}
                      >
                        {(row.persentase || 0) >= 80 ? 'Aman' : 'Bahaya! (<80%)'}
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
