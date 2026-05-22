'use client';

import { useState } from 'react';
import { Calendar, User, Clock } from 'lucide-react';

interface UjianItem {
  matkul: string;
  dosen: string;
  tanggal: string;
  jam: string;
  tipe: 'Teori' | 'Praktikum';
}

export default function MahasiswaUasPage() {
  const [uasList] = useState<UjianItem[]>([
    { matkul: 'Workshop Pemrograman Framework', dosen: "Mu'arifin S.ST., M.T", tanggal: 'Senin, 15 Juni 2026', jam: '08:50 - 11:20', tipe: 'Praktikum' },
    { matkul: 'Workshop Administrasi Jaringan', dosen: 'Dr Idris Winarno S.ST, M.Kom', tanggal: 'Rabu, 17 Juni 2026', jam: '08:00 - 10:30', tipe: 'Praktikum' },
    { matkul: 'Praktek Kecerdasan Buatan', dosen: 'Yuliana Setiowati S.Kom, M.Kom', tanggal: 'Jumat, 19 Juni 2026', jam: '10:30 - 13:00', tipe: 'Praktikum' },
    { matkul: 'Bahasa Indonesia', dosen: 'Dr Ferry Astika Saputra ST, M.Sc', tanggal: 'Selasa, 16 Juni 2026', jam: '11:20 - 13:00', tipe: 'Teori' },
    { matkul: 'Workshop Administrasi Basis Data', dosen: 'Arif Basofi S.Kom, M.T', tanggal: 'Kamis, 18 Juni 2026', jam: '13:00 - 15:30', tipe: 'Praktikum' },
    { matkul: 'Workshop Desain Pengalaman Pengguna', dosen: 'Desy Intan Permatasari S.Kom., M.Kom', tanggal: 'Selasa, 16 Juni 2026', jam: '13:50 - 16:20', tipe: 'Praktikum' },
  ]);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Jadwal Ujian Akhir Semester (UAS)
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Jadwal perkiraan resmi Ujian Akhir Semester Genap di platform online PENS.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Daftar Jadwal UAS Aktif</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>Dosen Pengampu</th>
                <th>Tipe</th>
                <th>Tanggal Ujian</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {uasList.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.matkul}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={14} className="text-muted" />
                      <span>{row.dosen}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        backgroundColor: row.tipe === 'Teori' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        color: row.tipe === 'Teori' ? 'var(--color-primary)' : '#8b5cf6',
                      }}
                    >
                      {row.tipe}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} className="text-muted" />
                      <span>{row.tanggal}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} className="text-muted" />
                      <span>{row.jam}</span>
                    </div>
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
