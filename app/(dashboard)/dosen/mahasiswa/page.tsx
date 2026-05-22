'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Eye, Filter } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import type { RingkasanMahasiswa } from '../../../../lib/types';

export default function MahasiswaListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [mahasiswa, setMahasiswa] = useState<RingkasanMahasiswa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMahasiswa() {
      try {
        const { data, error } = await supabase
          .from('v_ringkasan_mahasiswa')
          .select('*')
          .order('nama_lengkap', { ascending: true });
        if (error) throw error;
        setMahasiswa(data ?? []);
      } catch (error) {
        console.error('Error fetching mahasiswa:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMahasiswa();
  }, []);

  const filteredMhs = mahasiswa.filter(
    (m) =>
      (m.nama_lengkap || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.nrp || '').includes(searchTerm)
  );

  return (
    <div className="animate-fade-in">
      <div
        className="mb-4"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
        <div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Mahasiswa Binaan</h1>
          <p className="text-muted">Daftar seluruh mahasiswa yang berada di bawah perwalian Anda.</p>
        </div>
        <button className="btn btn-primary">
          <Filter size={16} /> Filter Data
        </button>
      </div>

      {/* Search */}
      <div className="card mb-4" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Cari berdasarkan Nama atau NRP..."
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>NRP</th>
                <th>Nama Mahasiswa</th>
                <th>Kelas</th>
                <th>Kehadiran</th>
                <th>IPK</th>
                <th>Alert</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
                    Memuat data...
                  </td>
                </tr>
              ) : (
                filteredMhs.map((mhs) => (
                  <tr key={mhs.id}>
                    <td className="text-muted" style={{ fontWeight: 500 }}>
                      {mhs.nrp}
                    </td>
                    <td style={{ fontWeight: 600 }}>{mhs.nama_lengkap}</td>
                    <td>{mhs.kelas}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: 'var(--color-border)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(mhs.avg_kehadiran ?? 0, 100)}%`,
                              height: '100%',
                              backgroundColor:
                                mhs.avg_kehadiran >= 80
                                  ? 'var(--color-success)'
                                  : 'var(--color-danger)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {mhs.avg_kehadiran ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          (mhs.ipk_kumulatif ?? 0) >= 3.0 ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {(mhs.ipk_kumulatif ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {mhs.jumlah_alert_aktif > 0 ? (
                        <span className="badge badge-danger">{mhs.jumlah_alert_aktif} Alert</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Aman
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/dosen/mahasiswa/${mhs.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Eye size={14} /> Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
              {!loading && filteredMhs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
                    Tidak ada data mahasiswa yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
