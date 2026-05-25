'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Plus, FileText, Clock, Search } from 'lucide-react';

export default function CatatanPerwalianPage() {
  const { user } = useAuth();
  const [catatan, setCatatan] = useState<any[]>([]);
  const [mahasiswa, setMahasiswa] = useState<any[]>([]);
  const [selectedMhs, setSelectedMhs] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [semesterId, setSemesterId] = useState('');

  const fetchData = useCallback(async (userId: string) => {
    const { data: dw } = await supabase.from('dosen_wali').select('id').eq('user_id', userId).maybeSingle();
    if (!dw) {
      setLoading(false);
      return;
    }

    const [mhsRes, semRes, catRes] = await Promise.all([
      supabase.from('mahasiswa').select('id, nrp, nama_lengkap').eq('dosen_wali_id', dw.id).order('nama_lengkap'),
      supabase.from('semester').select('id, nama').eq('is_aktif', true).maybeSingle(),
      supabase.from('catatan_perwalian').select('*, mahasiswa(nrp, nama_lengkap)').eq('dosen_wali_id', dw.id).order('created_at', { ascending: false }),
    ]);

    setMahasiswa(mhsRes.data ?? []);
    if (semRes.data) setSemesterId(semRes.data.id);
    setCatatan(catRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData(user.id);
  }, [user, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMhs || !judul.trim() || !isi.trim() || !user) return;
    setSubmitting(true);
    try {
      const { data: dw } = await supabase.from('dosen_wali').select('id').eq('user_id', user.id).maybeSingle();
      if (!dw) return;

      await supabase.from('catatan_perwalian').insert({
        mahasiswa_id: selectedMhs,
        dosen_wali_id: dw.id,
        semester_id: semesterId || null,
        judul: judul.trim(),
        isi_catatan: isi.trim(),
        tindak_lanjut: tindakLanjut.trim() || null,
        status: 'final',
      });

      const { data: newCat } = await supabase
        .from('catatan_perwalian')
        .select('*, mahasiswa(nrp, nama_lengkap)')
        .eq('dosen_wali_id', dw.id)
        .order('created_at', { ascending: false });

      setCatatan(newCat ?? []);
      setJudul('');
      setIsi('');
      setTindakLanjut('');
      setSelectedMhs('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatatan = catatan.filter((c) =>
    c.mahasiswa?.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    c.mahasiswa?.nrp?.toLowerCase().includes(search.toLowerCase()) ||
    c.judul?.toLowerCase().includes(search.toLowerCase())
  );

  const getMhsName = (mhsId: string) => mahasiswa.find((m) => m.id === mhsId)?.nama_lengkap || 'Unknown';

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      <div className="mb-4">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Catatan Perwalian</h1>
        <p className="text-muted">Buat dan kelola catatan perwalian untuk mahasiswa binaan.</p>
      </div>

      <div className="card p-6 mb-6">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} style={{ color: 'var(--color-primary)' }} /> Catatan Baru
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Mahasiswa</label>
            <select className="form-control" value={selectedMhs} onChange={(e) => setSelectedMhs(e.target.value)} required>
              <option value="">Pilih Mahasiswa</option>
              {mahasiswa.map((m) => (
                <option key={m.id} value={m.id}>{m.nama_lengkap} ({m.nrp})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Judul Catatan</label>
            <input className="form-control" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Ringkasan catatan perwalian" required />
          </div>
          <div>
            <label className="form-label">Isi Catatan</label>
            <textarea className="form-control" value={isi} onChange={(e) => setIsi(e.target.value)} rows={4} placeholder="Detail hasil konsultasi..." required style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="form-label">Tindak Lanjut (opsional)</label>
            <textarea className="form-control" value={tindakLanjut} onChange={(e) => setTindakLanjut(e.target.value)} rows={2} placeholder="Rencana tindak lanjut..." style={{ resize: 'vertical' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Menyimpan...' : 'Simpan Catatan'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Riwayat Catatan</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="text" className="form-control" style={{ paddingLeft: '1.75rem', width: '200px', fontSize: '0.8rem' }} placeholder="Cari catatan..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">Memuat catatan...</div>
          ) : filteredCatatan.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
              <FileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>Belum ada catatan perwalian.</p>
            </div>
          ) : filteredCatatan.map((c) => (
            <div key={c.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ color: 'var(--color-primary)' }}>{c.mahasiswa?.nama_lengkap || getMhsName(c.mahasiswa_id)}</strong>
                  <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: '0.8rem' }}>{c.mahasiswa?.nrp || ''}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> {new Date(c.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{c.judul}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.isi_catatan}</p>
              {c.tindak_lanjut && (
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Tindak Lanjut:</span> {c.tindak_lanjut}
                </div>
              )}
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: c.status === 'final' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: c.status === 'final' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
