'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Calendar, User, Clock, FileText, Loader2, ExternalLink } from 'lucide-react';

export default function MahasiswaUtsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/mahasiswa/exam?jenis=UTS', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setExams(body.data.uts || body.data.all || []);
          }
        }
      } catch (e) {
        console.error('Error fetching exams:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Jadwal Ujian Tengah Semester (UTS)
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Jadwal resmi Ujian Tengah Semester dari ETHOL PENS.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            Daftar Jadwal UTS Aktif
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
              ({exams.length} ujian)
            </span>
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>Keterangan</th>
                <th>Tanggal Ujian</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                    <FileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Belum ada jadwal UTS. Sinkronisasikan data ETHOL Anda.</p>
                  </td>
                </tr>
              ) : exams.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.matakuliah || row.matkul || 'Mata Kuliah'}</td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {row.keterangan || 'UTS'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} className="text-muted" />
                      <span>{row.tglIndonesia || row.tanggal || 'Jadwal'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} className="text-muted" />
                      <span>{row.waktu || 'Sesuai Jadwal'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {exams.length > 0 && (
        <div className="card mt-4" style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.03)' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} />
            Data ujian diambil langsung dari ETHOL PENS. Untuk info lebih lanjut, kunjungi portal ujian.
            <a href="https://ethol.pens.ac.id/mahasiswa/ujian" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              ETHOL Ujian <ExternalLink size={12} />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
