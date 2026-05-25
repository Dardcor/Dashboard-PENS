'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { ClipboardList, Calendar, CheckCircle2, AlertCircle, ExternalLink, Clock, RefreshCw, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function MahasiswaTugasOnlinePage() {
  const { user } = useAuth();
  const [tugasList, setTugasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTugas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: mhs } = await supabase.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
      if (!mhs) return;

      const { data } = await supabase
        .from('tugas')
        .select('*, mata_kuliah:mata_kuliah_id(nama)')
        .eq('mahasiswa_id', mhs.id)
        .order('deadline', { ascending: true });

      if (data) setTugasList(data);
    } catch (e) {
      console.error('Error fetching tugas:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTugas(); }, [fetchTugas]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Tugas Online
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Pantau seluruh daftar tugas, status pengumpulan, dan tenggat waktu mata kuliah aktif Anda.
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={14} /> {tugasList.length} tugas
        </div>
      </div>

      {tugasList.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>Belum ada tugas</h3>
          <p className="text-muted">Sinkronisasikan data ETHOL Anda untuk melihat daftar tugas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tugasList.map((t) => {
            const isSubmitted = t.status !== 'Belum mengumpulkan';
            const deadlineDate = t.deadline ? new Date(t.deadline) : null;
            const isOverdue = deadlineDate && deadlineDate < new Date() && !isSubmitted;

            return (
              <div key={t.id} className="card p-5" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderLeft: `5px solid ${isSubmitted ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b'}`,
                gap: '2rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: 'var(--radius-md)',
                    backgroundColor: isSubmitted ? '#10b98110' : isOverdue ? '#ef444410' : '#f59e0b10',
                    color: isSubmitted ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {isSubmitted ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t.mata_kuliah?.nama || 'Mata Kuliah'}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.15rem 0' }}>
                      {t.judul}
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                      {deadlineDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? '#ef4444' : 'inherit' }}>
                          <Calendar size={12} />
                          Deadline: {deadlineDate.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span style={{ fontWeight: 600, color: isSubmitted ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b' }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <Link
                    href={`/mahasiswa/kuliah/${t.mata_kuliah_id || ''}?tab=TUGAS`}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', textDecoration: 'none' }}
                  >
                    Detail <ChevronRight size={14} />
                  </Link>
                  {t.sumber_ethol && (
                    <a href={t.sumber_ethol} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ExternalLink size={14} /> ETHOL
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
