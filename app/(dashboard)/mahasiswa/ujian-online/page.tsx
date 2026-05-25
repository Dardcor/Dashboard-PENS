'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Calendar, Clock, FileText, Loader2, ExternalLink, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function MahasiswaUjianOnlinePage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/mahasiswa/exam', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setExams(body.data.all || []);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, [user]);

  const uts = exams.filter((e: any) => e.jenis === 'UTS' || !e.jenis);
  const uas = exams.filter((e: any) => e.jenis === 'UAS');

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
          Ujian Online
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Jadwal dan informasi ujian tengah semester (UTS) dan akhir semester (UAS).
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/mahasiswa/uts" className="card" style={{ flex: 1, minWidth: '200px', padding: '1.5rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <FileText size={32} style={{ color: '#3b82f6' }} />
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)' }}>UTS</h3>
            <p className="text-muted" style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }}>{uts.length} ujian</p>
          </div>
        </Link>
        <Link href="/mahasiswa/uas" className="card" style={{ flex: 1, minWidth: '200px', padding: '1.5rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8b5cf6' }}>
          <BookOpen size={32} style={{ color: '#8b5cf6' }} />
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)' }}>UAS</h3>
            <p className="text-muted" style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }}>{uas.length} ujian</p>
          </div>
        </Link>
      </div>

      {exams.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Semua Jadwal Ujian</h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mata Kuliah</th>
                  <th>Jenis</th>
                  <th>Keterangan</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((row: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.matakuliah || row.matkul || '-'}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, backgroundColor: (row.jenis === 'UAS' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)'), color: row.jenis === 'UAS' ? '#8b5cf6' : '#3b82f6' }}>
                        {row.jenis || 'UTS'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{row.keterangan || '-'}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} className="text-muted" />{row.tglIndonesia || row.tanggal || '-'}</div></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} className="text-muted" />{row.waktu || '-'}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
