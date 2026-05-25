'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Play, Loader2, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';

export default function MahasiswaVideoPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [videosByCourse, setVideosByCourse] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const { data: mhs } = await supabase.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
        if (!mhs) return;

        const { data: kehadiran } = await supabase
          .from('kehadiran')
          .select('mata_kuliah:mata_kuliah_id(id, nama, kode)')
          .eq('mahasiswa_id', mhs.id);

        if (kehadiran) {
          const unique = new Map();
          kehadiran.forEach((k: any) => {
            if (k.mata_kuliah && !unique.has(k.mata_kuliah.id)) {
              unique.set(k.mata_kuliah.id, k.mata_kuliah);
            }
          });
          setCourses(Array.from(unique.values()));

          // Try to fetch videos from ETHOL for each course
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const videoMap: Record<string, any[]> = {};
          for (const [id, course] of unique) {
            try {
              const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=video`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const body = await res.json();
                if (body.success && body.data.length > 0) {
                  videoMap[id] = body.data;
                }
              }
            } catch { }
          }
          setVideosByCourse(videoMap);
        }
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
          Video Pembelajaran
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Video perkuliahan dan materi pembelajaran asinkron dari setiap mata kuliah.
        </p>
      </div>

      {Object.keys(videosByCourse).length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <Play size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>Belum ada video pembelajaran</h3>
          <p className="text-muted">Video akan muncul setelah dosen mengunggah materi video di ETHOL.</p>
        </div>
      ) : (
        Object.entries(videosByCourse).map(([courseId, videos]) => {
          const course = courses.find((c: any) => c.id === courseId);
          return (
            <div key={courseId} className="card mb-4">
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: '1rem' }}>
                  {course?.nama || 'Mata Kuliah'}
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                    ({videos.length} video)
                  </span>
                </h2>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {videos.map((v: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.3)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={22} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{v.judul}</h4>
                        {v.keterangan && <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.15rem 0 0' }}>{v.keterangan}</p>}
                      </div>
                    </div>
                    {(v.url_video || v.url) && (
                      <a href={v.url_video || v.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ExternalLink size={14} /> Putar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
