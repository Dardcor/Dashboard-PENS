'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { AlertTriangle, Loader2, CheckCircle, User, Clock, Filter } from 'lucide-react';
import Link from 'next/link';

export default function DosenAlertPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('aktif');

  useEffect(() => {
    async function fetchAlerts() {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_alert_aktif')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAlerts(data || []);
      } catch (e) {
        console.error('Error fetching alerts:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, [user]);

  const filteredAlerts = filter === 'semua' ? alerts : alerts.filter((a) => a.status === filter || a.status_alert === filter);

  const getColor = (tipe: string) => {
    const colors: Record<string, string> = {
      nilai_rendah: '#ef4444',
      kehadiran_buruk: '#f59e0b',
      ipk_turun: '#8b5cf6',
      sks_tidak_cukup: '#3b82f6',
      belum_konsultasi: '#6b7280',
    };
    return colors[tipe] || '#6b7280';
  };

  const getLabel = (tipe: string) => {
    const labels: Record<string, string> = {
      nilai_rendah: 'Nilai Rendah',
      kehadiran_buruk: 'Kehadiran Buruk',
      ipk_turun: 'IPK Menurun',
      sks_tidak_cukup: 'SKS Tidak Cukup',
      belum_konsultasi: 'Belum Konsultasi',
    };
    return labels[tipe] || tipe;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Alert Akademik
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Pantau mahasiswa binaan yang memerlukan perhatian akademik ({alerts.length} aktif).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={16} className="text-muted" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-control" style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <option value="aktif">Aktif</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
            <option value="semua">Semua</option>
          </select>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <CheckCircle size={48} style={{ color: '#10b981', opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>Tidak ada alert aktif</h3>
          <p className="text-muted">Semua mahasiswa binaan dalam kondisi baik.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredAlerts.map((alert, idx) => (
            <div key={alert.id || idx} className="card p-4" style={{ borderLeft: `4px solid ${getColor(alert.tipe_alert)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} style={{ color: getColor(alert.tipe_alert), flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <Link href={`/dosen/mahasiswa/${alert.mahasiswa_id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                        {alert.nama_lengkap}
                      </Link>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{alert.nrp}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: `${getColor(alert.tipe_alert)}15`, color: getColor(alert.tipe_alert) }}>
                        {getLabel(alert.tipe_alert)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {alert.deskripsi}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {alert.kelas || '-'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {new Date(alert.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
                <Link href={`/dosen/mahasiswa/${alert.mahasiswa_id}`} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', flexShrink: 0 }}>
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
