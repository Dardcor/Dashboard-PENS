'use client';

import { useState } from 'react';
import { BookOpen, Search, Download, FileText } from 'lucide-react';

interface MateriItem {
  matkul: string;
  title: string;
  format: string;
  size: string;
  uploader: string;
}

export default function MahasiswaMateriPerkuliahanPage() {
  const [programFilter, setProgramFilter] = useState('D3');
  const [jurusanFilter, setJurusanFilter] = useState('Teknik Informatika');
  const [searchQuery, setSearchQuery] = useState('');

  const [materiList] = useState<MateriItem[]>([
    { matkul: 'Bahasa Indonesia', title: 'Buku-Menulis-Karil-Jurnal', format: 'RAR', size: '12.4 MB', uploader: 'Dr Ferry Astika Saputra ST, M.Sc' },
    { matkul: 'Bahasa Indonesia', title: 'TataBahasaKaril', format: 'PDF', size: '2.8 MB', uploader: 'Dr Ferry Astika Saputra ST, M.Sc' },
    { matkul: 'Bahasa Indonesia', title: 'Tentang-Kalimat', format: 'PDF', size: '1.5 MB', uploader: 'Dr Ferry Astika Saputra ST, M.Sc' },
    { matkul: 'Kecerdasan Buatan', title: '01 - Introduction to AI & Fuzzy Logic', format: 'PDF', size: '4.2 MB', uploader: 'Entin Martiana Kusumaningtyas S.Kom, M.Kom' },
    { matkul: 'Workshop Pemrograman Framework', title: 'Modul 02 - Next.js Routing & Data Fetching', format: 'PDF', size: '3.1 MB', uploader: "Mu'arifin S.ST., M.T" },
  ]);

  const filteredMateri = materiList.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.matkul.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="card p-4" style={{ border: '1px solid var(--color-border)' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Filter Program
          </label>
          <select
            className="form-control"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
          >
            <option value="D3">D3 (Diploma 3)</option>
            <option value="D4">D4 (Diploma 4)</option>
            <option value="Pascasarjana">Pascasarjana</option>
          </select>
        </div>

        <div className="card p-4" style={{ border: '1px solid var(--color-border)' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Filter Jurusan
          </label>
          <select
            className="form-control"
            value={jurusanFilter}
            onChange={(e) => setJurusanFilter(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
          >
            <option value="Teknik Informatika">Teknik Informatika</option>
            <option value="Teknik Komputer">Teknik Komputer</option>
            <option value="Teknik Telekomunikasi">Teknik Telekomunikasi</option>
          </select>
        </div>

        <div className="card p-4" style={{ border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Pencarian Materi
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari materi..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.65rem 2.25rem 0.65rem', borderRadius: 'var(--radius-md)', paddingLeft: '2.25rem' }}
            />
            <Search size={16} className="text-muted" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredMateri.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: m.format === 'RAR' ? '#8b5cf615' : '#ef444415',
                  color: m.format === 'RAR' ? '#8b5cf6' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {m.format}
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {m.matkul}
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.1rem 0' }}>
                  {m.title}
                </h4>
                <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                  Uploader: {m.uploader} &bull; Ukuran: {m.size}
                </p>
              </div>
            </div>

            <button
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem',
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-light)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              <Download size={14} />
              Download
            </button>
          </div>
        ))}

        {filteredMateri.length === 0 && (
          <div className="card p-8 text-center text-muted">
            Tidak ada materi perkuliahan yang cocok dengan pencarian Anda.
          </div>
        )}
      </div>
    </div>
  );
}
