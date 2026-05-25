'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Save } from 'lucide-react';

export default function AdminKonfigurasiPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.from('konfigurasi_alert').select('*').then(({ data }) => {
      setConfigs(data ?? []);
      setLoading(false);
    });
  }, []);

  const updateConfig = (id: string, field: string, value: any) => {
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      for (const cfg of configs) {
        await supabase.from('konfigurasi_alert').update({ threshold_value: cfg.threshold_value, is_aktif: cfg.is_aktif }).eq('id', cfg.id);
      }
      setMessage('Konfigurasi berhasil disimpan!');
    } catch (err) {
      setMessage('Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div className="p-6 text-muted">Memuat konfigurasi...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Konfigurasi Alert Akademik</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Semua'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
          backgroundColor: message.includes('berhasil') ? '#ecfdf5' : '#fef2f2',
          color: message.includes('berhasil') ? '#065f46' : '#991b1b',
          border: `1px solid ${message.includes('berhasil') ? '#a7f3d0' : '#fecaca'}`,
          fontSize: '0.85rem', fontWeight: 500,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {configs.map((cfg) => (
          <div key={cfg.id} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{cfg.nama}</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>{cfg.deskripsi}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={cfg.is_aktif} onChange={(e) => updateConfig(cfg.id, 'is_aktif', e.target.checked)} />
                Aktif
              </label>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>Threshold:</span>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '100px', display: 'inline-block', padding: '0.4rem 0.5rem' }}
                  value={cfg.threshold_value}
                  step="0.01"
                  onChange={(e) => updateConfig(cfg.id, 'threshold_value', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
