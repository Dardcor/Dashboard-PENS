'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { Calendar, Clock, MapPin, CheckCircle, AlertTriangle, Plus, X } from 'lucide-react';
import type { JadwalKonsultasi } from '../../../../lib/types';

export default function MahasiswaJadwalPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<JadwalKonsultasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [dosenWali, setDosenWali] = useState<{ id: string; nama_lengkap: string } | null>(null);
  const [mahasiswaId, setMahasiswaId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [waktuMulai, setWaktuMulai] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');
  const [catatan, setCatatan] = useState('');
  const [lokasi, setLokasi] = useState('Ruang Dosen D3 IT');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const { data: mhs, error: mhsErr } = await supabase
          .from('mahasiswa')
          .select('id, dosen_wali_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mhs) {
          setMahasiswaId(mhs.id);
          if (mhs.dosen_wali_id) {
            const { data: dos } = await supabase
              .from('dosen_wali')
              .select('id, nama_lengkap')
              .eq('id', mhs.dosen_wali_id)
              .maybeSingle();
            if (dos) {
              setDosenWali(dos);
            }
          }
        }

        const { data: sched, error: schedErr } = await supabase
          .from('jadwal_konsultasi')
          .select('*')
          .order('waktu_mulai', { ascending: false });

        if (sched) {
          setSchedules(sched as JadwalKonsultasi[]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mahasiswaId || !dosenWali) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('jadwal_konsultasi').insert({
        mahasiswa_id: mahasiswaId,
        dosen_wali_id: dosenWali.id,
        waktu_mulai: new Date(waktuMulai).toISOString(),
        waktu_selesai: new Date(waktuSelesai).toISOString(),
        status: 'menunggu',
        catatan: catatan.trim(),
        lokasi: lokasi.trim(),
        dibuat_oleh: user.id,
      }).select().single();

      if (!error && data) {
        setSchedules((prev) => [data as JadwalKonsultasi, ...prev]);
        setIsModalOpen(false);
        setWaktuMulai('');
        setWaktuSelesai('');
        setCatatan('');
      } else {
        alert(error?.message || 'Gagal membuat reservasi.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'dikonfirmasi':
        return { label: 'Dikonfirmasi', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'selesai':
        return { label: 'Selesai', bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' };
      case 'dibatalkan':
        return { label: 'Dibatalkan', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      default:
        return { label: 'Menunggu', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Jadwal Konsultasi Dosen Wali
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Ajukan reservasi bimbingan, konsultasi proyek akhir, dan curhat akademik ke Dosen Wali Anda.
          </p>
        </div>
        <button
          disabled={!dosenWali}
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          Reservasi Konsultasi
        </button>
      </div>

      {!dosenWali && (
        <div
          className="mb-6 p-4"
          style={{
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#ef4444',
          }}
        >
          <AlertTriangle size={20} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Akun Anda belum dikaitkan dengan Dosen Wali di sistem database. Silakan hubungi admin akademik.
          </span>
        </div>
      )}

      {dosenWali && (
        <div
          className="card p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(139, 92, 246, 0.07))',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
              Dosen Wali Pendamping Anda
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.25rem 0 0 0' }}>
              {dosenWali.nama_lengkap}
            </h3>
            <p className="text-muted" style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem' }}>
              Program Studi: D3 Teknik Informatika PENS
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              Aktif Bimbingan
            </span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Daftar Konsultasi Anda</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Lokasi</th>
                <th>Catatan Keperluan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                    Memuat daftar riwayat konsultasi...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
                    Belum ada reservasi konsultasi yang diajukan.
                  </td>
                </tr>
              ) : (
                schedules.map((row) => {
                  const badge = getStatusBadge(row.status);
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                            <Calendar size={14} className="text-muted" />
                            {new Date(row.waktu_mulai).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <Clock size={14} />
                            {new Date(row.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(row.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <MapPin size={14} className="text-muted" />
                          <span>{row.lokasi}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.catatan || '-'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card animate-scale-in"
            style={{
              width: '500px',
              maxWidth: '90%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 1.25rem 0' }}>
              Ajukan Bimbingan / Konsultasi
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Waktu Mulai
                </label>
                <input
                  type="datetime-local"
                  required
                  className="form-control"
                  value={waktuMulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Waktu Selesai
                </label>
                <input
                  type="datetime-local"
                  required
                  className="form-control"
                  value={waktuSelesai}
                  onChange={(e) => setWaktuSelesai(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Lokasi Pertemuan
                </label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Catatan Keperluan / Topik
                </label>
                <textarea
                  required
                  rows={3}
                  className="form-control"
                  placeholder="Contoh: Konsultasi proposal proyek akhir bab 1..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontWeight: 700, marginTop: '0.5rem' }}
              >
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Reservasi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
