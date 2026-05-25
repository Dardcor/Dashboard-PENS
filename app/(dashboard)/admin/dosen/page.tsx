'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Search } from 'lucide-react';

export default function AdminDosenPage() {
  const [dosen, setDosen] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nama_lengkap: '', nip: '', prodi: '' });

  useEffect(() => {
    supabase.from('dosen_wali').select('*').order('nama_lengkap').then(({ data }) => {
      setDosen(data ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = dosen.filter((d) =>
    d.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    d.nip?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (id: string) => {
    await supabase.from('dosen_wali').update(editForm).eq('id', id);
    setDosen((prev) => prev.map((d) => d.id === id ? { ...d, ...editForm } : d));
    setEditId(null);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Kelola Dosen Wali</h1>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Cari nama/NIP..." className="form-control" style={{ paddingLeft: '2rem', width: '280px' }} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Nama</th><th>NIP</th><th>Prodi</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Tidak ada data dosen.</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id}>
                  {editId === d.id ? (
                    <>
                      <td><input className="form-control" value={editForm.nama_lengkap} onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })} /></td>
                      <td><input className="form-control" value={editForm.nip} onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })} /></td>
                      <td><input className="form-control" value={editForm.prodi} onChange={(e) => setEditForm({ ...editForm, prodi: e.target.value })} /></td>
                      <td>
                        <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSave(d.id)}>Simpan</button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginLeft: '0.5rem' }} onClick={() => setEditId(null)}>Batal</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>{d.nama_lengkap}</td>
                      <td>{d.nip}</td>
                      <td>{d.prodi}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => { setEditId(d.id); setEditForm({ nama_lengkap: d.nama_lengkap, nip: d.nip, prodi: d.prodi }); }}>
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
