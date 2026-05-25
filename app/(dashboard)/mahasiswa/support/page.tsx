'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { HelpCircle, Loader2, Plus, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function MahasiswaSupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [judul, setJudul] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/mahasiswa/support', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) setTickets(body.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !keterangan.trim()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/mahasiswa/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create', judul, keterangan }),
      });
      if (res.ok) {
        setShowCreate(false);
        setJudul('');
        setKeterangan('');
        await fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (nomor: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch('/api/mahasiswa/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'resolve', nomor }),
      });
      await fetchTickets();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (nomor: number) => {
    if (!confirm('Hapus tiket ini?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`/api/mahasiswa/support?nomor=${nomor}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchTickets();
    } catch (e) {
      console.error(e);
    }
  };

  const loadTicket = async (nomor: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/mahasiswa/support?nomor=${nomor}&action=detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setSelectedTicket(body.data.detail);
          setReplies(body.data.replies || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/mahasiswa/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'reply', nomor: selectedTicket.nomor, balasan: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText('');
        await loadTicket(selectedTicket.nomor);
      }
    } catch (e) {
      console.error(e);
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Bantuan & Dukungan
          </h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Ajukan tiket bantuan untuk masalah teknis atau akademik.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Tiket Baru
        </button>
      </div>

      {/* Create Ticket Form */}
      {showCreate && (
        <div className="card p-4 mb-4" style={{ border: '2px solid var(--color-primary)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Buat Tiket Baru</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text" placeholder="Judul tiket..." className="form-control" value={judul} onChange={(e) => setJudul(e.target.value)} required style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }} />
            <textarea placeholder="Jelaskan masalah Anda..." className="form-control" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required rows={4} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Mengirim...' : 'Kirim Tiket'}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline">Batal</button>
            </div>
          </form>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <HelpCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>Belum ada tiket</h3>
          <p className="text-muted">Buat tiket baru untuk mendapatkan bantuan.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tickets.map((t: any, idx: number) => (
            <div key={idx} className="card p-4" style={{ borderLeft: `4px solid ${t.status === 'selesai' ? '#10b981' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.judul || `Tiket #${t.nomor}`}</h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {t.keterangan?.substring(0, 200)}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', alignItems: 'center' }}>
                    <Clock size={12} />
                    <span>{t.tanggal || t.createdAt || '-'}</span>
                    <span style={{ fontWeight: 600, color: t.status === 'selesai' ? '#10b981' : '#f59e0b' }}>
                      {t.status || 'Aktif'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {t.status !== 'selesai' && (
                    <button onClick={() => handleResolve(t.nomor)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                      <CheckCircle size={14} /> Selesai
                    </button>
                  )}
                  <button onClick={() => handleDelete(t.nomor)} className="btn" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: '#ef4444', background: 'none', border: '1px solid #ef4444' }}>
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
