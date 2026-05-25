'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function AdminMahasiswaPage() {
  const [mahasiswa, setMahasiswa] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('v_ringkasan_mahasiswa')
        .select('*')
        .order('nama_lengkap');
      setMahasiswa(data ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = mahasiswa.filter((m) =>
    m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    m.nrp?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Kelola Mahasiswa</h1>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Cari nama/NRP..."
            className="form-control"
            style={{ paddingLeft: '2rem', width: '280px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NRP</th>
                <th>Kelas</th>
                <th>Prodi</th>
                <th>Angkatan</th>
                <th>IPK</th>
                <th>Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Tidak ada data mahasiswa.</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.nama_lengkap}</td>
                  <td>{m.nrp}</td>
                  <td>{m.kelas}</td>
                  <td>{m.prodi}</td>
                  <td>{m.angkatan}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: m.ipk_kumulatif < 3.0 ? '#ef4444' : '#10b981' }}>
                      {m.ipk_kumulatif?.toFixed(2) || '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: m.avg_kehadiran < 80 ? '#ef4444' : '#10b981' }}>
                      {m.avg_kehadiran?.toFixed(1) || '-'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
