'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useAuth } from '../../../../../context/AuthContext';
import {
  Video,
  MessageSquare,
  BookOpen,
  ClipboardList,
  Download,
  Send,
  User,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';

interface EnrolledCourse {
  id: string;
  nama: string;
  dosen: string;
  sks: number;
  hari: string;
  jam: string;
  ruang: string;
  kode: string;
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [course, setCourse] = useState<EnrolledCourse | null>(null);
  const [activeTab, setActiveTab] = useState<'KULIAH' | 'FORUM' | 'MATERI' | 'TUGAS'>('KULIAH');
  const [forumMessage, setForumMessage] = useState('');
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string; self: boolean }[]>([
    { sender: 'Mu\'arifin S.ST., M.T', text: 'Selamat pagi rekan-rekan mahasiswa. Hari ini perkuliahan dimulai pukul 08:00.', time: '07:55', self: false },
    { sender: 'Syahrul Ardi Prasetiyo', text: 'Baik pak, saya sudah bersiap masuk zoom.', time: '07:58', self: true },
  ]);

  const realEtholCourses: EnrolledCourse[] = [
    { id: '1', nama: 'Workshop Pemrograman Framework', dosen: "Mu'arifin S.ST., M.T", sks: 3, hari: 'Senin', jam: '08:00 - 10:30', ruang: 'Ruang C 206', kode: 'PPF-2025' },
    { id: '2', nama: 'Workshop Desain Pengalaman Pengguna', dosen: 'Desy Intan Permatasari S.Kom., M.Kom', sks: 3, hari: 'Selasa', jam: '13:50 - 16:20', ruang: 'Ruang C 203', kode: 'UXD-2025' },
    { id: '3', nama: 'Proposal Proyek Akhir', dosen: 'Rengga Asmara S.Kom., M.T', sks: 2, hari: 'Rabu', jam: '09:00 - 10:40', ruang: 'Ruang Sidang D3 IT', kode: 'PPA-2025' },
    { id: '4', nama: 'Bahasa Indonesia', dosen: 'Dr Ferry Astika Saputra ST, M.Sc', sks: 2, hari: 'Selasa', jam: '11:20 - 13:00', ruang: 'Ruang C 206', kode: 'BIN-2025' },
    { id: '5', nama: 'Workshop Aplikasi dan Komputasi Awan', dosen: 'Yesta Medya Mahardhika S.Tr.Kom., M.T', sks: 3, hari: 'Kamis', jam: '08:00 - 10:30', ruang: 'Lab Komputasi Awan', kode: 'ACC-2025' },
    { id: '6', nama: 'Workshop Administrasi Jaringan', dosen: 'Dr Idris Winarno S.ST, M.Kom', sks: 3, hari: 'Rabu', jam: '08:00 - 10:30', ruang: 'Lab Jaringan Komputer', kode: 'WAN-2025' },
    { id: '7', nama: 'Workshop Administrasi Basis Data', dosen: 'Arif Basofi S.Kom, M.T', sks: 3, hari: 'Kamis', jam: '13:00 - 15:30', ruang: 'Lab Basis Data', kode: 'DBA-2025' },
    { id: '8', nama: 'Workshop Pemrograman Perangkat Bergerak', dosen: 'Dr Selvia Ferdiana Kusuma M.Kom', sks: 3, hari: 'Jumat', jam: '08:00 - 10:30', ruang: 'Lab Pemrograman Mobile', kode: 'MAD-2025' },
    { id: '9', nama: 'Kecerdasan Buatan', dosen: 'Entin Martiana Kusumaningtyas S.Kom, M.Kom', sks: 3, hari: 'Senin', jam: '10:30 - 13:00', ruang: 'Ruang C 206', kode: 'AI-2025' },
    { id: '10', nama: 'Praktek Kecerdasan Buatan', dosen: 'Yuliana Setiowati S.Kom, M.Kom', sks: 1, hari: 'Senin', jam: '13:00 - 14:40', ruang: 'Lab Artificial Intelligence', kode: 'PAI-2025' },
    { id: '11', nama: 'Workshop Pengembangan Perangkat Lunak berbasis Agile', dosen: 'Adam Shidqul Aziz S.ST., M.T', sks: 3, hari: 'Selasa', jam: '08:00 - 10:30', ruang: 'Ruang C 203', kode: 'ASD-2025' }
  ];

  useEffect(() => {
    async function loadDetail() {
      try {
        const { data: mk } = await supabase.from('mata_kuliah').select('*').eq('id', id).maybeSingle();
        if (mk) {
          const fb = realEtholCourses.find((c) => c.nama.toLowerCase().includes(mk.nama.substring(0, 10).toLowerCase())) || realEtholCourses[0];
          setCourse({
            id: mk.id,
            nama: mk.nama,
            dosen: fb.dosen,
            sks: mk.sks ?? 3,
            hari: fb.hari,
            jam: fb.jam,
            ruang: fb.ruang,
            kode: mk.kode || fb.kode
          });
        } else {
          const fb = realEtholCourses.find((c) => c.id === id) || realEtholCourses[0];
          setCourse(fb);
        }
      } catch (e) {
        console.error(e);
        const fb = realEtholCourses.find((c) => c.id === id) || realEtholCourses[0];
        setCourse(fb);
      }
    }
    loadDetail();
  }, [id]);

  const presensiHistory = [
    { no: 1, tanggal: 'Senin, 04 Mei 2026', jam: '08:01:42', status: 'Hadir' },
    { no: 2, tanggal: 'Senin, 27 April 2026', jam: '08:00:15', status: 'Hadir' },
    { no: 3, tanggal: 'Senin, 20 April 2026', jam: '08:02:11', status: 'Hadir' },
    { no: 4, tanggal: 'Senin, 06 April 2026', jam: '08:05:00', status: 'Hadir' },
  ];

  const materiList = [
    { title: 'Buku-Menulis-Karil-Jurnal', format: 'RAR', size: '12.4 MB', date: 'Jumat, 11 April 2025 - 07:24' },
    { title: 'TataBahasaKaril', format: 'PDF', size: '2.8 MB', date: 'Jumat, 11 April 2025 - 07:21' },
    { title: 'Tentang-Kalimat', format: 'PDF', size: '1.5 MB', date: 'Jumat, 07 Maret 2025 - 07:49' },
  ];

  const tugasList = [
    { title: 'Versi Final Rancangan Aplikasi TBC', deadline: 'Senin, 11 Mei 2026 - 09:00', status: 'Belum Mengumpulkan', color: '#ef4444' },
    { title: 'Tugas 2 : Logika Fuzzy (Report)', deadline: 'Rabu, 06 Mei 2026 - 21:00', status: 'Selesai Dikumpulkan', color: '#10b981' }
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: 'Syahrul Ardi Prasetiyo', text: forumMessage.trim(), time: '08:09', self: true }
    ]);
    setForumMessage('');
  };

  if (!course) {
    return <div className="p-6 text-muted">Memuat detail perkuliahan...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        className="card p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.1))',
          border: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--color-primary)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            display: 'inline-block',
            marginBottom: '0.5rem',
          }}
        >
          {course.kode}
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          {course.nama}
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
          Dosen Pengampu: {course.dosen} &bull; SKS: {course.sks} &bull; Ruang: {course.ruang}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div
          className="card p-3"
          style={{
            width: '220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            border: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          {[
            { id: 'KULIAH', label: 'Kuliah Online', icon: Video },
            { id: 'FORUM', label: 'Forum Diskusi', icon: MessageSquare },
            { id: 'MATERI', label: 'Materi Kuliah', icon: BookOpen },
            { id: 'TUGAS', label: 'Tugas Online', icon: ClipboardList },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--color-primary-light)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: active ? 700 : 500,
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="card p-6" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'KULIAH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.12))',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                    Status Kelas Saat Ini
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--color-text-primary)' }}>
                    Kelas Sedang Berlangsung
                  </h3>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem' }}>
                    Jadwal: {course.hari}, {course.jam}
                  </p>
                </div>
                <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Video size={16} />
                  Join Room Kuliah
                </button>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                  Riwayat Kehadiran Presensi Anda
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>No</th>
                        <th>Tanggal Kuliah</th>
                        <th>Jam Presensi</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presensiHistory.map((row) => (
                        <tr key={row.no}>
                          <td>{row.no}</td>
                          <td style={{ fontWeight: 500 }}>{row.tanggal}</td>
                          <td>{row.jam}</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#10b981',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                              }}
                            >
                              <CheckCircle size={14} />
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FORUM' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '380px', justifyContent: 'space-between' }}>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.self ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: m.self ? 'var(--color-primary)' : 'rgba(255,255,255,0.7)',
                      color: m.self ? 'white' : 'var(--color-text-primary)',
                      border: m.self ? 'none' : '1px solid var(--color-border)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, marginBottom: '0.25rem' }}>
                      {m.sender}
                    </div>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{m.text}</div>
                    <div style={{ fontSize: '0.65rem', textAlign: 'right', opacity: 0.7, marginTop: '0.25rem' }}>
                      {m.time}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Ketik pesan diskusi kelas..."
                  className="form-control"
                  value={forumMessage}
                  onChange={(e) => setForumMessage(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
                />
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Send size={16} />
                  Kirim
                </button>
              </form>
            </div>
          )}

          {activeTab === 'MATERI' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                Modul & Slide Perkuliahan
              </h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                Silakan download materi perkuliahan resmi dari dosen pengampu untuk bahan belajar mandiri.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {materiList.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: m.format === 'RAR' ? '#8b5cf615' : '#ef444415',
                          color: m.format === 'RAR' ? '#8b5cf6' : '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {m.format}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                          {m.title}
                        </h4>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.15rem 0 0 0' }}>
                          Ukuran: {m.size} &bull; Uploaded: {m.date}
                        </p>
                      </div>
                    </div>
                    <button
                      className="btn"
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        border: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'TUGAS' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                Tugas Online Perkuliahan
              </h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                Pastikan mengumpulkan lembar jawaban tugas Anda sebelum batas waktu berakhir.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tugasList.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      border: '1px solid var(--color-border)',
                      borderLeft: `4px solid ${t.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                        {t.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: t.color,
                          backgroundColor: `${t.color}10`,
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                      Deadline Pengumpulan: {t.deadline}
                    </p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        Lihat Deskripsi
                      </button>
                      {t.status.includes('Belum') && (
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                          Upload Tugas
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
