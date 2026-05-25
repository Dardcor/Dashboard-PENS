'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, AlertTriangle, Settings, Activity, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRealtime } from '../../../context/RealtimeContext';
import type { LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  href: string;
}

export default function AdminDashboardPage() {
  const [totalMhs, setTotalMhs] = useState(0);
  const [totalDosen, setTotalDosen] = useState(0);
  const [totalMatkul, setTotalMatkul] = useState(0);
  const [totalAlert, setTotalAlert] = useState(0);
  const [loading, setLoading] = useState(true);
  const [semesterInfo, setSemesterInfo] = useState('');
  const { alertBaru } = useRealtime();

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { count: mhsCount },
          { count: dosenCount },
          { count: matkulCount },
          { count: alertCount },
          { data: sem }
        ] = await Promise.all([
          supabase.from('mahasiswa').select('*', { count: 'exact', head: true }),
          supabase.from('dosen_wali').select('*', { count: 'exact', head: true }),
          supabase.from('mata_kuliah').select('*', { count: 'exact', head: true }),
          supabase.from('alert_akademik').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
          supabase.from('semester').select('nama').eq('is_aktif', true).maybeSingle(),
        ]);

        setTotalMhs(mhsCount ?? 0);
        setTotalDosen(dosenCount ?? 0);
        setTotalMatkul(matkulCount ?? 0);
        setTotalAlert((alertCount ?? 0) + alertBaru.length);
        if (sem?.nama) setSemesterInfo(sem.nama);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [alertBaru.length]);

  const statCards: StatCard[] = [
    { title: 'Mahasiswa', value: totalMhs, icon: Users, color: '#3b82f6', href: '/admin/mahasiswa' },
    { title: 'Dosen Wali', value: totalDosen, icon: BookOpen, color: '#10b981', href: '/admin/dosen' },
    { title: 'Mata Kuliah', value: totalMatkul, icon: Calendar, color: '#8b5cf6', href: '#' },
    { title: 'Alert Aktif', value: totalAlert, icon: AlertTriangle, color: '#ef4444', href: '/admin/alert' },
  ];

  if (loading) {
    return <div className="p-6 text-muted">Memuat dashboard admin...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      <div className="mb-4">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>Dashboard Admin</h1>
        <p className="text-muted">Overview sistem akademik - {semesterInfo || 'Semester Aktif'}</p>
      </div>

      {alertBaru.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: 'var(--color-text-primary)', fontSize: '0.85rem',
        }}>
          <Activity size={16} style={{ color: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span><strong>{alertBaru.length}</strong> alert akademik baru terdeteksi secara real-time</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <Link key={index} href={stat.href} style={{ textDecoration: 'none' }}>
            <div className="card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{stat.title}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} /> Quick Actions
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/admin/konfigurasi" className="btn btn-primary" style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', textDecoration: 'none' }}>
              <Settings size={18} /> Konfigurasi Alert Threshold
            </Link>
            <Link href="/admin/mahasiswa" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', textDecoration: 'none' }}>
              <Users size={18} /> Kelola Mahasiswa
            </Link>
            <Link href="/admin/dosen" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', textDecoration: 'none' }}>
              <BookOpen size={18} /> Kelola Dosen Wali
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} /> Sistem Info
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Total Mahasiswa</span>
              <span style={{ fontWeight: 700 }}>{totalMhs}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Total Dosen Wali</span>
              <span style={{ fontWeight: 700 }}>{totalDosen}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Total Mata Kuliah</span>
              <span style={{ fontWeight: 700 }}>{totalMatkul}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Alert Aktif</span>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>{totalAlert}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
