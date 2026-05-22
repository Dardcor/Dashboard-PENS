'use client';

import { useState } from 'react';
import { ClipboardList, Calendar, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface TugasItem {
  id: string;
  title: string;
  matkul: string;
  deadline: string;
  status: 'Mengumpulkan' | 'Belum Mengumpulkan';
  dateSubmitted?: string;
  color: string;
}

export default function MahasiswaTugasOnlinePage() {
  const [tugasList] = useState<TugasItem[]>([
    {
      id: '1',
      title: 'Versi Final Rancangan Aplikasi TBC',
      matkul: 'Proposal Proyek Akhir',
      deadline: 'Senin, 11 Mei 2026 - 09:00',
      status: 'Belum Mengumpulkan',
      color: '#ef4444',
    },
    {
      id: '2',
      title: 'Tugas 2 : Logika Fuzzy (Report PDF)',
      matkul: 'Kecerdasan Buatan',
      deadline: 'Rabu, 06 Mei 2026 - 21:00',
      status: 'Mengumpulkan',
      dateSubmitted: 'Rabu, 06 Mei 2026 - 14:10',
      color: '#10b981',
    },
    {
      id: '3',
      title: 'Tugas Praktikum 3 : REST API & Controller',
      matkul: 'Workshop Pemrograman Framework',
      deadline: 'Jumat, 01 Mei 2026 - 23:59',
      status: 'Mengumpulkan',
      dateSubmitted: 'Jumat, 01 Mei 2026 - 20:30',
      color: '#10b981',
    },
  ]);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Tugas Online
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Pantau seluruh daftar tugas, status pengumpulan, dan tenggat waktu mata kuliah aktif Anda.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tugasList.map((t) => (
          <div
            key={t.id}
            className="card p-5"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--color-border)',
              borderLeft: `5px solid ${t.color}`,
              gap: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: t.status === 'Mengumpulkan' ? '#10b98110' : '#ef444410',
                  color: t.status === 'Mengumpulkan' ? '#10b981' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {t.status === 'Mengumpulkan' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {t.matkul}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0.15rem 0' }}>
                  {t.title}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    Deadline: {t.deadline}
                  </span>
                  {t.dateSubmitted && (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      Dikumpulkan pada: {t.dateSubmitted}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                Detail
              </button>
              {t.status === 'Belum Mengumpulkan' && (
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                  Upload Tugas
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
