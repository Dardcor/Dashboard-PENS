'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle, TrendingDown, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { RingkasanMahasiswa, AlertAktif } from '../../../lib/types';
import type { LucideIcon } from 'lucide-react';

interface StatCard {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

export default function DosenDashboardPage() {
  const [mahasiswa, setMahasiswa] = useState<RingkasanMahasiswa[]>([]);
  const [alerts, setAlerts] = useState<AlertAktif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: mhsData, error: mhsError } = await supabase
          .from('v_ringkasan_mahasiswa')
          .select('*');
        if (mhsError) throw mhsError;
        setMahasiswa(mhsData ?? []);

        const { data: alertData, error: alertError } = await supabase
          .from('v_alert_aktif')
          .select('*')
          .order('created_at', { ascending: false });
        if (alertError) throw alertError;
        setAlerts(alertData ?? []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6 text-muted">Memuat data dashboard...</div>;
  }

  const statCards: StatCard[] = [
    { title: 'Total Mahasiswa Binaan', value: mahasiswa.length,                                          icon: Users,       color: 'var(--color-primary)' },
    { title: 'Alert Aktif',            value: alerts.length,                                             icon: AlertCircle, color: 'var(--color-danger)'  },
    { title: 'IPK < 3.0',             value: mahasiswa.filter((m) => m.ipk_kumulatif < 3.0).length,    icon: TrendingDown,color: 'var(--color-warning)' },
    { title: 'Kehadiran < 80%',       value: mahasiswa.filter((m) => m.avg_kehadiran  < 80).length,    icon: Clock,       color: 'var(--color-danger)'  },
  ];

  const tipeAlertClass = (tipe: string) => {
    if (tipe === 'kehadiran_buruk') return 'badge-danger';
    if (tipe === 'ipk_turun')       return 'badge-warning';
    return 'badge-primary';
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Dashboard Dosen Wali</h1>
        <p className="text-muted">Ringkasan kondisi akademik mahasiswa binaan Anda.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-4">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: `${stat.color}15`,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {stat.title}
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Alert Table */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h2 className="card-title">Alert Akademik Terbaru</h2>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
              Lihat Semua
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mahasiswa</th>
                  <th>NRP</th>
                  <th>Tipe Alert</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 5).map((alert) => (
                  <tr key={alert.id}>
                    <td style={{ fontWeight: 500 }}>{alert.nama_lengkap}</td>
                    <td className="text-muted">{alert.nrp}</td>
                    <td>
                      <span className={`badge ${tipeAlertClass(alert.tipe_alert)}`}>
                        {alert.tipe_alert.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="text-danger" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Butuh Perhatian
                      </span>
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                      Tidak ada alert aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Perlu Konsultasi */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Perlu Konsultasi</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mahasiswa
              .filter((m) => Number(m.jumlah_alert_aktif) > 0)
              .map((mhs) => (
                <div
                  key={mhs.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mhs.nama_lengkap}</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {mhs.jumlah_alert_aktif} Alert Aktif
                    </p>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                    Jadwalkan
                  </button>
                </div>
              ))}
            {mahasiswa.filter((m) => Number(m.jumlah_alert_aktif) > 0).length === 0 && (
              <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                Tidak ada mahasiswa yang perlu konsultasi mendesak.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
