'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { BookOpen, Search, Download, FileText, Loader2, ExternalLink } from 'lucide-react';

export default function MahasiswaMateriPerkuliahanPage() {
  const { user } = useAuth();
  const [materiList, setMateriList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const allMateri: any[] = [];
        for (const [id, course] of unique) {
          try {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=materi`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success && Array.isArray(body.data)) {
                body.data.forEach((m: any) => allMateri.push({ ...m, courseName: (course as any).nama, courseId: id }));
              }
            }
          } catch { }
        }
        setMateriList(allMateri);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = materiList.filter((m) => {
    const matchesSearch = m.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.courseName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = !selectedCourse || m.courseId === selectedCourse;
    return matchesSearch && matchesCourse;
  });

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
          Materi Perkuliahan
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Unduh materi digital, file presentasi, dan modul praktikum dari seluruh mata kuliah aktif Anda.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card p-4" style={{ flex: 1, minWidth: '200px', border: '1px solid var(--color-border)' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Filter Mata Kuliah</label>
          <select className="form-control" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
            <option value="">Semua Mata Kuliah</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </div>

        <div className="card p-4" style={{ flex: 1, minWidth: '200px', border: '1px solid var(--color-border)' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Pencarian Materi</label>
          <div style={{ position: 'relative' }}>
            <input type="text" placeholder="Cari materi..." className="form-control" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.25rem', borderRadius: 'var(--radius-md)' }} />
            <Search size={16} className="text-muted" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.3)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                {m.ekstensiFile || m.ekstensi_file || 'PDF'}
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {m.courseName || 'Mata Kuliah'}
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.1rem 0' }}>{m.judul || m.title || 'Materi'}</h4>
                <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                  {m.keterangan ? `${m.keterangan.substring(0, 100)}` : ''}
                  {m.createdIndonesia ? ` \u2022 ${m.createdIndonesia}` : ''}
                  {m.pertemuan ? ` \u2022 Pertemuan ${m.pertemuan}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {m.path && (
                <a href={m.path} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Download size={14} /> Unduh
                </a>
              )}
              <a href={`/mahasiswa/kuliah/${m.courseId}?tab=MATERI`} className="btn" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'none', fontWeight: 600 }}>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card p-8 text-center text-muted">
            <BookOpen size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>Tidak ada materi perkuliahan yang ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
