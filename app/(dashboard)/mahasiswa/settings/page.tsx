'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { useRealtime } from '../../../../context/RealtimeContext';
import { Calendar, LogOut, User, RefreshCw, Activity } from 'lucide-react';

export default function SettingsPage() {
  const { user, role, logout } = useAuth();
  const { wsEventLog } = useRealtime();
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [semRes, mhsRes] = await Promise.all([
        supabase.from('semester').select('*').order('tahun_akademik', { ascending: false }),
        supabase.from('mahasiswa').select('*, dosen_wali(nama_lengkap)').eq('user_id', user?.id).maybeSingle(),
      ]);

      setSemesters(semRes.data ?? []);
      const active = semRes.data?.find((s) => s.is_aktif);
      if (active) setSelectedSemester(active.id);
      setProfile(mhsRes.data);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Pengaturan</h1>

      {/* Profile Card */}
      <div className="card p-6 mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1.5rem',
          }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{user?.full_name || 'User'}</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>{user?.email} &bull; {role?.replace('_', ' ')}</p>
            {profile && (
              <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                NRP: {profile.nrp} &bull; {profile.kelas} &bull; {profile.prodi}
                {profile.dosen_wali && <> &bull; Dosen Wali: {profile.dosen_wali.nama_lengkap}</>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Semester Selection */}
      <div className="card p-6 mb-6">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} /> Semester Aktif
        </h2>
        <select className="form-control" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={{ maxWidth: '400px' }}>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama} {s.is_aktif ? '(Aktif)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Real-time Status */}
      <div className="card p-6 mb-6">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} /> Status Real-time
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Total Event Real-time</span>
            <span style={{ fontWeight: 700 }}>{wsEventLog.length}</span>
          </div>
          {wsEventLog.slice(0, 5).map((ev, i) => (
            <div key={i} style={{
              padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(59,130,246,0.05)', fontSize: '0.8rem',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600 }}>{ev.type}</span>
              <span className="text-muted">{ev.timestamp.toLocaleTimeString('id-ID')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button className="btn btn-danger" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <LogOut size={16} /> Keluar
      </button>
    </div>
  );
}
