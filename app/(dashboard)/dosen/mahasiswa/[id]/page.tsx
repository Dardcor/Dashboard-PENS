'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { ArrowLeft, User, Book, Award, Clock } from 'lucide-react';

export default function MahasiswaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [mahasiswa, setMahasiswa] = useState<any>(null);
  const [kehadiran, setKehadiran] = useState<any[]>([]);
  const [nilai, setNilai] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch profile
        const { data: mhsData, error: mhsError } = await supabase
          .from('v_ringkasan_mahasiswa')
          .select('*')
          .eq('id', id)
          .single();
        if (mhsError) throw mhsError;
        setMahasiswa(mhsData);

        // Fetch Kehadiran (v_kehadiran_matkul or from table)
        const { data: khdData, error: khdErr } = await supabase
          .from('kehadiran')
          .select('*, mata_kuliah(nama, kode)')
          .eq('mahasiswa_id', id);
        if (khdErr) throw khdErr;
        setKehadiran(khdData ?? []);

        // Fetch Nilai
        const { data: nilaiData, error: nilaiErr } = await supabase
          .from('nilai_mahasiswa')
          .select('*, mata_kuliah(nama, kode)')
          .eq('mahasiswa_id', id);
        if (nilaiErr) throw nilaiErr;
        setNilai(nilaiData ?? []);

      } catch (err) {
        console.error('Error fetching detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-6 text-muted">Memuat detail mahasiswa...</div>;
  if (!mahasiswa) return <div className="p-6 text-danger">Mahasiswa tidak ditemukan.</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <button 
          onClick={() => router.back()} 
          className="btn btn-secondary" 
          style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Detail Mahasiswa</h1>
        <p className="text-muted">Profil akademik lengkap untuk {mahasiswa.nama_lengkap}.</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Profil Card */}
        <div className="card p-6" style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)'
            }}>
              <User size={40} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{mahasiswa.nama_lengkap}</h2>
              <p className="text-muted">{mahasiswa.nrp}</p>
            </div>
          </div>
          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--color-border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Program Studi</span>
              <span style={{ fontWeight: 500 }}>{mahasiswa.prodi}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Kelas</span>
              <span style={{ fontWeight: 500 }}>{mahasiswa.kelas}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">IPK Kumulatif</span>
              <span className={`badge ${(mahasiswa.ipk_kumulatif ?? 0) >= 3.0 ? 'badge-success' : 'badge-warning'}`}>
                {(mahasiswa.ipk_kumulatif ?? 0).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Rata-rata Kehadiran</span>
              <span style={{ fontWeight: 500 }}>{mahasiswa.avg_kehadiran ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Kehadiran & Nilai Tabs / Sections */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} className="text-primary" />
              <h2 className="card-title" style={{ margin: 0 }}>Nilai Akademik (Semester Ini)</h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Mata Kuliah</th>
                    <th>Nilai Akhir (UAS)</th>
                  </tr>
                </thead>
                <tbody>
                  {nilai.length > 0 ? (
                    nilai.map((n) => (
                      <tr key={n.id}>
                        <td className="text-muted">{n.mata_kuliah?.kode || '-'}</td>
                        <td style={{ fontWeight: 500 }}>{n.mata_kuliah?.nama || 'Unknown'}</td>
                        <td>{n.nilai_uas ?? '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="text-center text-muted p-4">Belum ada data nilai.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} className="text-primary" />
              <h2 className="card-title" style={{ margin: 0 }}>Kehadiran Mata Kuliah</h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mata Kuliah</th>
                    <th>Total</th>
                    <th>Hadir</th>
                    <th>Alpha</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {kehadiran.length > 0 ? (
                    kehadiran.map((k) => {
                      const pct = k.total_pertemuan > 0 ? Math.round((k.hadir / k.total_pertemuan) * 100) : 0;
                      return (
                        <tr key={k.id}>
                          <td style={{ fontWeight: 500 }}>{k.mata_kuliah?.nama || '-'}</td>
                          <td>{k.total_pertemuan}</td>
                          <td>{k.hadir}</td>
                          <td>{k.alpha}</td>
                          <td>
                            <span className={`badge ${pct >= 80 ? 'badge-success' : 'badge-danger'}`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={5} className="text-center text-muted p-4">Belum ada data kehadiran.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
