'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { HelpCircle, Loader2, ExternalLink, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function MahasiswaQuizPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const { data: mhs } = await supabase.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
        if (!mhs) return;

        const { data: kehadiran } = await supabase.from('kehadiran')
          .select('mata_kuliah:mata_kuliah_id(id, nama)')
          .eq('mahasiswa_id', mhs.id);

        const allQuizzes: any[] = [];
        if (kehadiran) {
          const unique = new Map();
          kehadiran.forEach((k: any) => {
            if (k.mata_kuliah && !unique.has(k.mata_kuliah.id)) {
              unique.set(k.mata_kuliah.id, k.mata_kuliah);
            }
          });
          setCourses(Array.from(unique.values()));

          for (const [id, course] of unique) {
            try {
              const res = await fetch(`/api/mahasiswa/quiz?kuliah=${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const body = await res.json();
                if (body.success && Array.isArray(body.data)) {
                  body.data.forEach((q: any) => allQuizzes.push({ ...q, courseName: (course as any).nama }));
                }
              }
            } catch { }
          }
        }
        setQuizzes(allQuizzes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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
          Kuis
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Daftar kuis online dari seluruh mata kuliah aktif Anda.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <HelpCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>Belum ada kuis</h3>
          <p className="text-muted">Kuis akan muncul setelah dosen membuka sesi kuis di ETHOL.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {quizzes.map((q, idx) => (
            <div key={idx} className="card p-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HelpCircle size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase' }}>
                    {q.courseName || 'Mata Kuliah'}
                  </span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.1rem 0' }}>{q.judul}</h4>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {q.tglIndo || q.tanggal || 'Jadwal'}
                  </p>
                </div>
              </div>
              <a href={`https://ethol.pens.ac.id/mahasiswa/quiz/${q.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Kerjakan <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
