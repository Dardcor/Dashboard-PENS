'use client';

import { useState } from 'react';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react';

interface ScheduledItem {
  nama: string;
  dosen: string;
  sks: number;
  jam: string;
  ruang: string;
}

export default function MahasiswaJadwalOnlinePage() {
  const scheduleData: Record<string, ScheduledItem[]> = {
    'Senin': [
      { nama: 'Workshop Pemrograman Framework', dosen: "Mu'arifin S.ST., M.T", sks: 3, jam: '08:00 - 10:30', ruang: 'Ruang C 206' },
      { nama: 'Kecerdasan Buatan', dosen: 'Entin Martiana Kusumaningtyas S.Kom, M.Kom', sks: 3, jam: '10:30 - 13:00', ruang: 'Ruang C 206' },
      { nama: 'Praktek Kecerdasan Buatan', dosen: 'Yuliana Setiowati S.Kom, M.Kom', sks: 1, jam: '13:00 - 14:40', ruang: 'Lab Artificial Intelligence' }
    ],
    'Selasa': [
      { nama: 'Workshop Pengembangan Perangkat Lunak berbasis Agile', dosen: 'Adam Shidqul Aziz S.ST., M.T', sks: 3, jam: '08:00 - 10:30', ruang: 'Ruang C 203' },
      { nama: 'Bahasa Indonesia', dosen: 'Dr Ferry Astika Saputra ST, M.Sc', sks: 2, jam: '11:20 - 13:00', ruang: 'Ruang C 206' },
      { nama: 'Workshop Desain Pengalaman Pengguna', dosen: 'Desy Intan Permatasari S.Kom., M.Kom', sks: 3, jam: '13:50 - 16:20', ruang: 'Ruang C 203' }
    ],
    'Rabu': [
      { nama: 'Workshop Administrasi Jaringan', dosen: 'Dr Idris Winarno S.ST, M.Kom', sks: 3, jam: '08:00 - 10:30', ruang: 'Lab Jaringan Komputer' },
      { nama: 'Proposal Proyek Akhir', dosen: 'Rengga Asmara S.Kom., M.T', sks: 2, jam: '09:00 - 10:40', ruang: 'Ruang Sidang D3 IT' }
    ],
    'Kamis': [
      { nama: 'Workshop Aplikasi dan Komputasi Awan', dosen: 'Yesta Medya Mahardhika S.Tr.Kom., M.T', sks: 3, jam: '08:00 - 10:30', ruang: 'Lab Komputasi Awan' },
      { nama: 'Workshop Administrasi Basis Data', dosen: 'Arif Basofi S.Kom, M.T', sks: 3, jam: '13:00 - 15:30', ruang: 'Lab Basis Data' }
    ],
    'Jumat': [
      { nama: 'Workshop Pemrograman Perangkat Bergerak', dosen: 'Dr Selvia Ferdiana Kusuma M.Kom', sks: 3, jam: '08:00 - 10:30', ruang: 'Lab Pemrograman Mobile' }
    ]
  };

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const [selectedDay, setSelectedDay] = useState('Senin');

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Jadwal Online Mingguan
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Jadwal perkuliahan sinkron harian Anda di platform ETHOL PENS.
        </p>
      </div>

      <div
        className="card mb-6"
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: selectedDay === day ? 'var(--color-primary)' : 'transparent',
              color: selectedDay === day ? 'white' : 'var(--color-text-secondary)',
              transition: 'all var(--transition-fast)'
            }}
          >
            {day}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {scheduleData[selectedDay]?.map((item, idx) => (
          <div
            key={idx}
            className="card p-5 animate-scale-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--color-border)',
              gap: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
              <div
                style={{
                  width: '90px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                <Clock size={16} style={{ marginBottom: '0.25rem' }} />
                <span>{item.jam.split(' ')[0]}</span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  {item.nama}
                </h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.15rem 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={12} />
                  Dosen: {item.dosen} &bull; {item.sks} SKS
                </p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-success)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <MapPin size={12} />
                  {item.ruang}
                </span>
              </div>
            </div>

            <button
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem'
              }}
            >
              <span>Akses Kelas</span>
              <ChevronRight size={14} />
            </button>
          </div>
        ))}

        {(!scheduleData[selectedDay] || scheduleData[selectedDay].length === 0) && (
          <div className="card p-8 text-center text-muted">
            Tidak ada jadwal perkuliahan untuk hari ini.
          </div>
        )}
      </div>
    </div>
  );
}
