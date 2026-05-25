'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Calendar, Clock, Loader2, User, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DosenJadwalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('semua');

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function fetchJadwal() {
      setLoading(true);
      try {
        const { data: dosen } = await supabase
          .from('dosen_wali')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (dosen) {
          const { data } = await supabase
            .from('jadwal_konsultasi')
            .select('*, mahasiswa:mahasiswa_id(nrp, nama_lengkap, kelas, prodi)')
            .eq('dosen_wali_id', dosen.id)
            .order('waktu_mulai', { ascending: false });

          setJadwal(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchJadwal();
  }, [user]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      menunggu: '#f59e0b',
      dikonfirmasi: '#3b82f6',
      selesai: '#10b981',
      dibatalkan: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'selesai') return <CheckCircle size={16} style={{ color: '#10b981' }} />;
    if (status === 'dibatalkan') return <XCircle size={16} style={{ color: '#ef4444' }} />;
    return <Clock size={16} style={{ color: getStatusColor(status) }} />;
  };

  const handleConfirm = async (id: string) => {
    await supabase.from('jadwal_konsultasi').update({ status: 'dikonfirmasi' }).eq('id', id);
    setJadwal((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'dikonfirmasi' } : j)));
  };

  const handleComplete = async (id: string) => {
    await supabase.from('jadwal_konsultasi').update({ status: 'selesai' }).eq('id', id);
    setJadwal((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'selesai' } : j)));
  };

  const filtered = filter === 'semua' ? jadwal : jadwal.filter((j) => j.status === filter);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Jadwal Konsultasi
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Kelola jadwal konsultasi dengan mahasiswa binaan ({jadwal.length} total).
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-control" style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
          <option value="semua">Semua Status</option>
          <option value="menunggu">Menunggu</option>
          <option value="dikonfirmasi">Dikonfirmasi</option>
          <option value="selesai">Selesai</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>Belum ada jadwal konsultasi</h3>
          <p className="text-muted">Mahasiswa binaan dapat mengajukan jadwal konsultasi melalui halaman mereka.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((j) => {
            const mhs = j.mahasiswa as any;
            return (
              <div key={j.id} className="card p-4" style={{ borderLeft: `4px solid ${getStatusColor(j.status)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                      {mhs?.nama_lengkap?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                          {mhs?.nama_lengkap || 'Mahasiswa'}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{mhs?.nrp}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: `${getStatusColor(j.status)}15`, color: getStatusColor(j.status), textTransform: 'capitalize' }}>
                          {getStatusIcon(j.status)} {j.status}
                        </span>
                      </div>
                      <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                        {mhs?.kelas || '-'} &bull; {mhs?.prodi || '-'}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} />{new Date(j.waktu_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} />{new Date(j.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(j.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {j.lokasi && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={14} />{j.lokasi}
                          </span>
                        )}
                      </div>
                      {j.catatan && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          &ldquo;{j.catatan}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    {j.status === 'menunggu' && (
                      <>
                        <button onClick={() => handleConfirm(j.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                          Konfirmasi
                        </button>
                        <button onClick={() => handleComplete(j.id)} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                          Selesai
                        </button>
                      </>
                    )}
                    {j.status === 'dikonfirmasi' && (
                      <button onClick={() => handleComplete(j.id)} className="btn btn-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                        Tandai Selesai
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
