'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, AlertCircle, TrendingDown, Clock, BarChart3, PieChart, Activity, Bell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRealtime } from '../../../context/RealtimeContext';
import type { RingkasanMahasiswa, AlertAktif } from '../../../lib/types';
import type { LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import Link from 'next/link';

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
  const { kehadiranChanges, alertBaru, ipkUpdates } = useRealtime();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: mhsData } = await supabase.from('v_ringkasan_mahasiswa').select('*');
        setMahasiswa(mhsData ?? []);

        const { data: alertData } = await supabase
          .from('v_alert_aktif').select('*').order('created_at', { ascending: false });
        setAlerts(alertData ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Live updates from realtime context - merge kehadiran changes
  useEffect(() => {
    if (kehadiranChanges.length > 0) {
      setMahasiswa((prev) => prev.map((m) => {
        const change = kehadiranChanges.find((k) => k.mahasiswa_id === m.id);
        if (change) {
          return { ...m, avg_kehadiran: change.persentase_kehadiran };
        }
        return m;
      }));
    }
  }, [kehadiranChanges]);

  // Live updates - merge new alerts
  useEffect(() => {
    if (alertBaru.length > 0) {
      const latest = alertBaru[0];
      const exists = alerts.some((a) => a.id === latest.id);
      if (!exists) {
        const newAlert: AlertAktif = {
          id: latest.id,
          nama_lengkap: '',
          nrp: '',
          tipe_alert: latest.tipe_alert,
          created_at: latest.created_at,
        };
        setAlerts((prev) => [newAlert, ...prev]);
      }
    }
  }, [alertBaru]);

  const ipkLow = useMemo(() => mahasiswa.filter((m) => m.ipk_kumulatif < 3.0).length, [mahasiswa]);
  const kehadiranLow = useMemo(() => mahasiswa.filter((m) => m.avg_kehadiran < 80).length, [mahasiswa]);
  const sehat = mahasiswa.length - ipkLow - kehadiranLow;

  const statCards: StatCard[] = [
    { title: 'Total Mahasiswa Binaan', value: mahasiswa.length, icon: Users, color: 'var(--color-primary)' },
    { title: 'Alert Aktif', value: alerts.length + alertBaru.length, icon: AlertCircle, color: '#ef4444' },
    { title: 'IPK < 3.0', value: ipkLow, icon: TrendingDown, color: '#f59e0b' },
    { title: 'Kehadiran < 80%', value: kehadiranLow, icon: Clock, color: '#ef4444' },
  ];

  const pieData = [
    { name: 'Normal', value: Math.max(0, sehat), color: '#10b981' },
    { name: 'IPK < 3.0', value: ipkLow, color: '#f59e0b' },
    { name: 'Kehadiran < 80%', value: kehadiranLow, color: '#ef4444' },
  ];

  const barData = useMemo(() => mahasiswa.slice(0, 10).map((m) => ({
    name: m.nama_lengkap.length > 12 ? m.nama_lengkap.substring(0, 12) + '...' : m.nama_lengkap,
    IPK: m.ipk_kumulatif || 0,
    Kehadiran: m.avg_kehadiran || 0,
  })), [mahasiswa]);

  const alertTypes = ['kehadiran_buruk', 'nilai_rendah', 'ipk_turun', 'sks_tidak_cukup', 'belum_konsultasi'];
  const alertCounts = alertTypes.map((t) => ({
    name: t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: alerts.filter((a) => a.tipe_alert === t).length + alertBaru.filter((a) => a.tipe_alert === t).length,
    color: t === 'kehadiran_buruk' ? '#ef4444' : t === 'nilai_rendah' ? '#f59e0b' : t === 'ipk_turun' ? '#8b5cf6' : t === 'sks_tidak_cukup' ? '#3b82f6' : '#6b7280',
  }));

  const tipeAlertClass = (tipe: string) => {
    if (tipe === 'kehadiran_buruk') return 'badge-danger';
    if (tipe === 'ipk_turun') return 'badge-warning';
    return 'badge-primary';
  };

  const recentLiveAlerts = alertBaru.slice(0, 3);

  if (loading) {
    return <div className="p-6 text-muted">Memuat data dashboard...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      <div className="mb-4">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>Dashboard Dosen Wali</h1>
        <p className="text-muted">Ringkasan kondisi akademik mahasiswa binaan Anda.</p>
      </div>

      {/* Live Activity Bar */}
      {(alertBaru.length > 0 || kehadiranChanges.length > 0) && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.85rem', color: 'var(--color-text-primary)',
        }}>
          <Activity size={16} style={{ color: '#10b981', animation: 'pulse 2s infinite' }} />
          <span>
            <strong style={{ color: '#10b981' }}>Live:</strong>{' '}
            {alertBaru.length > 0 && <span>{alertBaru.length} alert baru </span>}
            {kehadiranChanges.length > 0 && <span>&bull; {kehadiranChanges.length} perubahan kehadiran </span>}
            {ipkUpdates.length > 0 && <span>&bull; {ipkUpdates.length} update IPK</span>}
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {index === 1 && alertBaru.length > 0 && (
              <span style={{
                position: 'absolute', top: '0.5rem', right: '0.5rem',
                width: 10, height: 10, borderRadius: '50%',
                backgroundColor: '#ef4444', animation: 'pulse 2s infinite',
              }} />
            )}
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{stat.title}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} /> IPK & Kehadiran (Top 10)
            </h2>
          </div>
          <div style={{ padding: '1rem', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="IPK" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Kehadiran" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={18} /> Status Akademik
            </h2>
          </div>
          <div style={{ padding: '1rem', height: '300px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alert Types Chart */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Distribusi Tipe Alert</h2>
        </div>
        <div style={{ padding: '1rem', height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alertCounts} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {alertCounts.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Alerts Banner */}
      {recentLiveAlerts.length > 0 && (
        <div className="card mb-6" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="card-header" style={{ backgroundColor: 'rgba(239,68,68,0.03)' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} style={{ color: '#ef4444' }} /> Alert Real-time Baru
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                backgroundColor: '#ef4444', color: 'white',
                padding: '0.15rem 0.5rem', borderRadius: '1rem',
              }}>
                LIVE
              </span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentLiveAlerts.map((alert) => (
              <div key={alert.id} style={{
                padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 2s infinite' }} />
                  <span className={`badge ${tipeAlertClass(alert.tipe_alert)}`}>
                    {alert.tipe_alert.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {new Date(alert.created_at).toLocaleTimeString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h2 className="card-title">Alert Akademik Terbaru</h2>
            <Link href="/dosen/alert" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}>
              Lihat Semua
            </Link>
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
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ef4444' }}>
                        Butuh Perhatian
                      </span>
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Tidak ada alert aktif.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Perlu Konsultasi</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mahasiswa.filter((m) => Number(m.jumlah_alert_aktif) > 0).length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                Semua mahasiswa dalam kondisi baik.
              </p>
            ) : (
              mahasiswa
                .filter((m) => Number(m.jumlah_alert_aktif) > 0)
                .slice(0, 6)
                .map((mhs) => (
                  <div key={mhs.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mhs.nama_lengkap}</p>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>{mhs.jumlah_alert_aktif} Alert Aktif</p>
                    </div>
                    <Link href={`/dosen/mahasiswa/${mhs.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                      Detail
                    </Link>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
