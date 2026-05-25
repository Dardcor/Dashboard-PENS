'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useAuth } from '../../../../../context/AuthContext';
import {
  Video, MessageSquare, BookOpen, ClipboardList, Download, Send,
  User, Clock, CheckCircle, FileText, AlertTriangle, PlayCircle,
  ExternalLink, ChevronRight, Megaphone, Users, HelpCircle, Activity
} from 'lucide-react';

interface CourseInfo {
  id: string;
  nama: string;
  dosen: string;
  sks: number;
  hari: string;
  jam: string;
  ruang: string;
  kode: string;
  etholCourseId: number;
  lecturerEmail?: string;
  conferenceLink?: string;
}

type TabId = 'KULIAH' | 'FORUM' | 'MATERI' | 'TUGAS' | 'PENGUMUMAN' | 'VIDEO' | 'PESERTA' | 'QUIZ';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
}

const TABS: TabConfig[] = [
  { id: 'KULIAH', label: 'Kuliah & Presensi', icon: Video },
  { id: 'FORUM', label: 'Forum Diskusi', icon: MessageSquare },
  { id: 'MATERI', label: 'Modul & Materi', icon: BookOpen },
  { id: 'TUGAS', label: 'Tugas Online', icon: ClipboardList },
  { id: 'PENGUMUMAN', label: 'Pengumuman', icon: Megaphone },
  { id: 'VIDEO', label: 'Video', icon: PlayCircle },
  { id: 'PESERTA', label: 'Peserta', icon: Users },
  { id: 'QUIZ', label: 'Kuis', icon: HelpCircle },
];

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('KULIAH');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [studentNomor, setStudentNomor] = useState<string>('');
  const [studentNrp, setStudentNrp] = useState<string>('');

  // KULIAH tab
  const [activeAttendance, setActiveAttendance] = useState<any>(null);
  const [latestAttendance, setLatestAttendance] = useState<any>(null);
  const [presensiHistory, setPresensiHistory] = useState<any[]>([]);

  // FORUM tab
  const [forumMessage, setForumMessage] = useState('');
  const [forumPosts, setForumPosts] = useState<any[]>([]);

  // MATERI tab
  const [materiList, setMateriList] = useState<any[]>([]);
  const [videoListInMateri, setVideoListInMateri] = useState<any[]>([]);

  // TUGAS tab
  const [tugasList, setTugasList] = useState<any[]>([]);

  // PENGUMUMAN tab
  const [pengumumanList, setPengumumanList] = useState<any[]>([]);

  // VIDEO tab
  const [videoList, setVideoList] = useState<any[]>([]);

  // PESERTA tab
  const [participants, setParticipants] = useState<any[]>([]);

  // QUIZ tab
  const [quizList, setQuizList] = useState<any[]>([]);

  // Load Main Course Info
  useEffect(() => {
    async function loadMainInfo() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: mhs } = await supabase.from('mahasiswa').select('id, nrp, user_id').eq('user_id', user.id).maybeSingle();
        if (mhs) {
          setStudentNrp(mhs.nrp);
        }

        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token || `bypass-token-for-${user.id}`;

        const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=info`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            const meta = body.data.courseMetadata;
            const lect = body.data.lecturer;
            const dbMk = body.data.localDb;

            if (meta?.nomor) setStudentNomor(String(meta.nomor));

            setCourse({
              id: dbMk.id,
              nama: dbMk.nama || meta?.matakuliah?.nama || 'Mata Kuliah',
              dosen: lect?.displayName || dbMk.dosen || meta?.dosen || 'Dosen Pengampu',
              sks: dbMk.sks || meta?.matakuliah?.sks || 3,
              hari: dbMk.hari || 'Sesuai Jadwal',
              jam: dbMk.jam || 'Sesuai Jadwal',
              ruang: dbMk.ruang || 'Kelas Virtual',
              kode: dbMk.kode || meta?.kode_kelas || 'MK-PENS',
              etholCourseId: meta?.nomor || parseInt(dbMk.ethol_course_id),
              lecturerEmail: lect?.email,
              conferenceLink: lect?.conference?.url || lect?.conference?.url_video
            });
          }
        }
      } catch (e) {
        console.error('Failed to load course header:', e);
      } finally {
        setLoading(false);
      }
    }
    loadMainInfo();
  }, [id, user]);

  // Load Tab Specific Info
  useEffect(() => {
    if (!user || !course) return;

    async function loadTabInfo() {
      setTabLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token || `bypass-token-for-${user?.id}`;

        switch (activeTab) {
          case 'KULIAH': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=presensi`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) {
                setPresensiHistory(body.data.history || []);
                setActiveAttendance(body.data.activeAttendance?.key ? body.data.activeAttendance : null);
                setLatestAttendance(body.data.latestAttendance);
              }
            }
            break;
          }
          case 'FORUM': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=forum`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) setForumPosts(body.data || []);
            }
            break;
          }
          case 'MATERI': {
            const [resMat, resVid] = await Promise.all([
              fetch(`/api/mahasiswa/kuliah/${id}?tab=materi`, {
                headers: { Authorization: `Bearer ${token}` }
              }),
              fetch(`/api/mahasiswa/kuliah/${id}?tab=video`, {
                headers: { Authorization: `Bearer ${token}` }
              })
            ]);
            if (resMat.ok) {
              const bodyMat = await resMat.json();
              if (bodyMat.success) setMateriList(bodyMat.data || []);
            }
            if (resVid.ok) {
              const bodyVid = await resVid.json();
              if (bodyVid.success) setVideoListInMateri(bodyVid.data || []);
            }
            break;
          }
          case 'TUGAS': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=tugas`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) setTugasList(body.data || []);
            }
            break;
          }
          case 'PENGUMUMAN': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=pengumuman`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) setPengumumanList(body.data || []);
            }
            break;
          }
          case 'VIDEO': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=video`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) setVideoList(body.data || []);
            }
            break;
          }
          case 'PESERTA': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=peserta`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) setParticipants(body.data || []);
            }
            break;
          }
          case 'QUIZ': {
            const res = await fetch(`/api/mahasiswa/kuliah/${id}?tab=quiz`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success) setQuizList(body.data || []);
            }
            break;
          }
        }
      } catch (e) {
        console.error('Failed to load tab details:', e);
      } finally {
        setTabLoading(false);
      }
    }

    loadTabInfo();
  }, [id, user, course, activeTab]);

  // Submit Self Attendance Absen
  const handleSubmitAbsen = async () => {
    if (!user || !activeAttendance || !activeAttendance.key) return;
    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || `bypass-token-for-${user.id}`;

      const res = await fetch(`/api/mahasiswa/kuliah/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'submit-presensi',
          key: activeAttendance.key,
          meetingId: activeAttendance.kuliah,
          originalMeetingId: activeAttendance.kuliah_asal || activeAttendance.kuliah,
          studentNomor: studentNomor
        })
      });

      if (res.ok) {
        alert('Presensi berhasil dikirim ke ETHOL!');
        setActiveTab('KULIAH');
        const updatedRes = await fetch(`/api/mahasiswa/kuliah/${id}?tab=presensi`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (updatedRes.ok) {
          const body = await updatedRes.json();
          if (body.success) {
            setPresensiHistory(body.data.history || []);
            setActiveAttendance(null);
          }
        }
      } else {
        const errBody = await res.json();
        alert(`Gagal presensi: ${errBody.message || 'Error tidak diketahui'}`);
      }
    } catch (e: any) {
      alert(`Terjadi kesalahan sistem: ${e.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Forum Message
  const handleSendForumMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumMessage.trim() || !user) return;

    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || `bypass-token-for-${user.id}`;

      const res = await fetch(`/api/mahasiswa/kuliah/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create-forum-post', narasi: forumMessage.trim() })
      });

      if (res.ok) {
        setForumMessage('');
        const updatedRes = await fetch(`/api/mahasiswa/kuliah/${id}?tab=forum`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (updatedRes.ok) {
          const body = await updatedRes.json();
          if (body.success) setForumPosts(body.data || []);
        }
      } else {
        alert('Gagal mengirim pesan ke forum.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
        <Clock className="animate-spin" size={24} />
        <span>Memuat detail perkuliahan...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 text-muted" style={{ textAlign: 'center' }}>
        <p>Gagal memuat perkuliahan. Pastikan mata kuliah ini memiliki ethol course ID di database.</p>
      </div>
    );
  }

  const alreadyAttended = activeAttendance && presensiHistory.some(
    (h) => h.key === activeAttendance.key ||
           (h.pertemuan && h.pertemuan.toString() === activeAttendance.pertemuan?.toString())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Profile */}
      <div className="card p-6" style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.1))',
        border: '1px solid var(--color-border)',
      }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          color: 'var(--color-primary)',
          padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)',
          display: 'inline-block', marginBottom: '0.5rem',
        }}>
          {course.kode}
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          {course.nama}
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
          Dosen Pengampu: <strong style={{ color: 'var(--color-text-primary)' }}>{course.dosen}</strong> &bull; SKS: {course.sks} &bull; Ruang: {course.ruang}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {course.lecturerEmail && (
            <a href={`mailto:${course.lecturerEmail}`} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center', textDecoration: 'none' }}>
              Email Dosen: {course.lecturerEmail}
            </a>
          )}
          {course.conferenceLink && (
            <a href={course.conferenceLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center', textDecoration: 'none' }}>
              <Video size={12} /> Conference Video Dosen
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Navigation Sidebar */}
        <div className="card p-3" style={{
          width: '220px', display: 'flex', flexDirection: 'column', gap: '0.35rem',
          border: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--color-primary-light)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: active ? 700 : 500, border: 'none', textAlign: 'left',
                  cursor: 'pointer', fontSize: '0.85rem', transition: 'all var(--transition-fast)',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="card p-6" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {tabLoading ? (
            <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
              <Clock className="animate-spin" size={24} />
              <span>Memuat data dari ETHOL PENS...</span>
            </div>
          ) : (
            <>
              {/* Tab: KULIAH */}
              {activeTab === 'KULIAH' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {activeAttendance ? (
                    <div style={{
                      padding: '1.25rem', borderRadius: 'var(--radius-md)',
                      background: alreadyAttended
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.12))'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.12))',
                      border: alreadyAttended ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: alreadyAttended ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                          Status Presensi Kelas
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--color-text-primary)' }}>
                          Pertemuan Ke-{activeAttendance.pertemuan || activeAttendance.minggu_ke || 'Aktif'}
                        </h3>
                        <p className="text-muted" style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem' }}>
                          {alreadyAttended ? 'Anda sudah melakukan presensi pada pertemuan ini.' : 'Presensi mandiri via PIN telah dibuka oleh dosen.'}
                        </p>
                      </div>
                      {!alreadyAttended && (
                        <button onClick={handleSubmitAbsen} disabled={submitting} className="btn btn-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} />
                          {submitting ? 'Mengirim...' : 'Presensi Sekarang'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '1rem', borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)', border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-secondary)'
                    }}>
                      <AlertTriangle size={18} />
                      <span style={{ fontSize: '0.85rem' }}>Saat ini tidak ada sesi presensi mandiri (PIN) yang sedang dibuka oleh Dosen.</span>
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>Riwayat Kehadiran Presensi</h3>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Minggu</th>
                            <th>Tanggal Kuliah</th>
                            <th>Materi Perkuliahan</th>
                            <th>Status Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presensiHistory.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                                Belum ada riwayat kehadiran terdokumentasi dari ethol.
                              </td>
                            </tr>
                          ) : presensiHistory.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700 }}>Ke-{row.pertemuan || row.minggu_ke || idx + 1}</td>
                              <td style={{ fontWeight: 500 }}>{row.waktuIndonesia || row.waktu_indonesia || 'Sesuai Sesi'}</td>
                              <td>{row.materi || 'Materi Perkuliahan'}</td>
                              <td>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                  color: (row.keterangan?.toLowerCase().includes('alfa') || row.keterangan?.toLowerCase().includes('alpha')) ? '#ef4444' : '#10b981',
                                  fontWeight: 600, fontSize: '0.8rem',
                                }}>
                                  <CheckCircle size={14} />
                                  {row.keterangan || 'Hadir'}
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

              {/* Tab: FORUM */}
              {activeTab === 'FORUM' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '450px', justifyContent: 'space-between' }}>
                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 'var(--radius-md)',
                    display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', border: '1px solid var(--color-border)'
                  }}>
                    {forumPosts.length === 0 ? (
                      <div style={{ margin: 'auto', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                        <MessageSquare size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>Belum ada diskusi di forum kelas ini.</p>
                      </div>
                    ) : forumPosts.map((post, idx) => {
                      const isSelf = post.nrp === studentNrp || post.nama === user?.email?.split('@')[0];
                      return (
                        <div key={idx} style={{
                          alignSelf: isSelf ? 'flex-end' : 'flex-start', maxWidth: '75%',
                          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                          backgroundColor: isSelf ? 'var(--color-primary)' : 'rgba(255,255,255,0.7)',
                          color: isSelf ? 'white' : 'var(--color-text-primary)',
                          border: isSelf ? 'none' : '1px solid var(--color-border)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}>
                          <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, marginBottom: '0.25rem' }}>
                            {post.namaPegawai || post.nama_mahasiswa || post.nama || 'Anggota Kelas'}
                          </div>
                          <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: post.narasi }} />
                          <div style={{ fontSize: '0.65rem', textAlign: 'right', opacity: 0.7, marginTop: '0.25rem' }}>
                            {post.waktu_indonesia || post.tanggal || 'Sesuai Sesi'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={handleSendForumMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                    <input type="text" placeholder="Ketik narasi pesan diskusi kelas..." className="form-control"
                      value={forumMessage} onChange={(e) => setForumMessage(e.target.value)} disabled={submitting}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)' }} />
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Send size={16} /> {submitting ? 'Kirim...' : 'Kirim'}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab: MATERI */}
              {activeTab === 'MATERI' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Modul & Slide Perkuliahan</h3>
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                      Modul dan slide presentasi perkuliahan resmi dari dosen pengampu.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {materiList.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                          <BookOpen size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                          <p>Belum ada file materi kuliah resmi yang diunggah.</p>
                        </div>
                      ) : materiList.map((m, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '1rem', borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem',
                            }}>
                              {m.ekstensiFile || m.ekstensi_file || 'PDF'}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                                {m.judul || m.title || 'Slide Materi'}
                              </h4>
                              <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.15rem 0 0 0' }}>
                                Pertemuan Ke-{m.pertemuan || 'Umum'} &bull; Uploaded: {m.createdIndonesia || 'Terjadwal'}
                              </p>
                            </div>
                          </div>
                          {m.path && (
                            <a href={m.path} target="_blank" rel="noopener noreferrer"
                              className="btn" style={{
                                padding: '0.5rem 0.75rem', fontSize: '0.8rem',
                                backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                border: 'none', fontWeight: 600, textDecoration: 'none'
                              }}>
                              <Download size={14} /> Unduh Materi
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                      Video Perkuliahan Pendukung
                    </h3>
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                      Daftar rekaman video perkuliahan atau materi pembelajaran asinkron.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {videoListInMateri.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                          <PlayCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                          <p>Belum ada video perkuliahan pendukung yang terdaftar.</p>
                        </div>
                      ) : videoListInMateri.map((v, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '1rem', borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <PlayCircle size={24} style={{ color: 'var(--color-primary)' }} />
                            <div>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{v.judul}</h4>
                              {v.keterangan && <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.15rem 0 0 0' }}>Keterangan: {v.keterangan}</p>}
                            </div>
                          </div>
                          {(v.url_video || v.url) && (
                            <a href={v.url_video || v.url} target="_blank" rel="noopener noreferrer"
                              className="btn btn-outline" style={{
                                padding: '0.5rem 0.75rem', fontSize: '0.8rem',
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                fontWeight: 600, textDecoration: 'none'
                              }}>
                              <ExternalLink size={14} /> Putar Video
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: TUGAS */}
              {activeTab === 'TUGAS' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Tugas & Lembar Pekerjaan</h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    Selesaikan dan kumpulkan lembar pekerjaan tugas Anda sebelum batas waktu yang ditentukan berakhir.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {tugasList.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                        <ClipboardList size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>Tidak ada lembar tugas aktif terdaftar untuk kelas ini.</p>
                      </div>
                    ) : tugasList.map((t, idx) => {
                      const submission = t.pekerjaanMahasiswa?.jawaban || t.pekerjaanMahasiswa;
                      const isSubmitted = !!submission && (submission.waktu_pengerjaan || submission.waktu || submission.link_pekerjaan);
                      const deadlineText = t.deadline_indonesia || t.tgl_deadline_indonesia || t.deadline || t.tgl_deadline || 'Tidak ditentukan';
                      return (
                        <div key={idx} style={{
                          display: 'flex', flexDirection: 'column', gap: '0.5rem',
                          padding: '1.25rem', borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)',
                          borderLeft: isSubmitted ? '4px solid #10b981' : '4px solid #ef4444',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                              {t.title || t.judul || t.judul_tugas || 'Tugas Kuliah'}
                            </h4>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 600,
                              color: isSubmitted ? '#10b981' : '#ef4444',
                              backgroundColor: isSubmitted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)',
                            }}>
                              {isSubmitted ? 'Sudah Mengumpulkan' : 'Belum Mengumpulkan'}
                            </span>
                          </div>
                          {t.description || t.keterangan || t.deskripsi || t.narasi ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: t.description || t.keterangan || t.deskripsi || t.narasi }} />
                          ) : null}
                          <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                            Batas Waktu Pengumpulan: <strong style={{ color: 'var(--color-text-primary)' }}>{deadlineText}</strong>
                          </p>
                          {isSubmitted && (
                            <div style={{
                              padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)',
                              marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
                            }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>DETIL PEKERJAAN ANDA:</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Waktu Kumpul: {submission.waktu_indonesia || submission.waktu || 'Telah Terkirim'}</span>
                              {submission.link_pekerjaan && (
                                <a href={submission.link_pekerjaan} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, display: 'inline-flex', gap: '0.25rem', alignItems: 'center', marginTop: '0.25rem', textDecoration: 'none' }}>
                                  <ExternalLink size={12} /> Buka Link Pekerjaan Anda
                                </a>
                              )}
                            </div>
                          )}
                          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                            <a href={`https://ethol.pens.ac.id/mahasiswa/kuliah/${course.etholCourseId}`} target="_blank" rel="noopener noreferrer"
                              className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>Akses & Kirim di ETHOL Web</span> <ChevronRight size={12} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: PENGUMUMAN */}
              {activeTab === 'PENGUMUMAN' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Pengumuman Kelas</h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    Pengumuman resmi dari dosen pengampu dan institusi.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pengumumanList.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                        <Megaphone size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>Belum ada pengumuman untuk kelas ini.</p>
                      </div>
                    ) : pengumumanList.map((p, idx) => (
                      <div key={idx} style={{
                        padding: '1rem', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.25rem' }}>
                            {p.judul || p.title || 'Pengumuman'}
                          </h4>
                          {p.isiPengumuman && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.25rem', lineHeight: 1.4 }}>{p.isiPengumuman}</p>
                          )}
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            {p.namaPegawai || p.publisher || 'PENS'} &bull; {p.waktuIndo || p.tanggal || 'Terbaru'}
                          </p>
                        </div>
                        {(p.path || p.file_url) && (
                          <a href={p.path || p.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', textDecoration: 'none', display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0, marginLeft: '1rem' }}>
                            <Download size={12} /> Unduh
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: VIDEO */}
              {activeTab === 'VIDEO' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Video Pembelajaran</h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    Koleksi video pembelajaran dan rekaman perkuliahan.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {videoList.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                        <Video size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>Belum ada video pembelajaran terdaftar untuk kelas ini.</p>
                      </div>
                    ) : videoList.map((v, idx) => (
                      <div key={idx} className="card" style={{ overflow: 'hidden' }}>
                        <div style={{
                          height: '160px', backgroundColor: 'rgba(59, 130, 246, 0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                        }}>
                          {v.image ? (
                            <img src={v.image} alt={v.judul} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <PlayCircle size={48} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
                          )}
                        </div>
                        <div style={{ padding: '1rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.25rem' }}>
                            {v.judul || 'Video Pembelajaran'}
                          </h4>
                          {v.keterangan && <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.5rem' }}>{v.keterangan}</p>}
                          {(v.url_video || v.url) && (
                            <a href={v.url_video || v.url} target="_blank" rel="noopener noreferrer"
                              className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', width: '100%', justifyContent: 'center' }}>
                              <ExternalLink size={14} /> Tonton Video
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: PESERTA */}
              {activeTab === 'PESERTA' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Peserta Kelas</h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    Daftar mahasiswa yang terdaftar dalam mata kuliah ini.
                  </p>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Nama</th>
                          <th>NRP</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                              Belum ada data peserta.
                            </td>
                          </tr>
                        ) : participants.map((p, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: 500 }}>{p.nama || p.nama_lengkap || 'Peserta'}</td>
                            <td className="text-muted">{p.nrp || '-'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.75rem', fontWeight: 600,
                                color: p.hakAktif !== '0' ? '#10b981' : '#ef4444',
                                padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)',
                                backgroundColor: p.hakAktif !== '0' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              }}>
                                {p.hakAktif !== '0' ? 'Aktif' : 'Non-aktif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: QUIZ */}
              {activeTab === 'QUIZ' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Kuis Online</h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    Daftar kuis yang tersedia untuk mata kuliah ini. Klik untuk mengerjakan di ETHOL.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {quizList.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                        <HelpCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>Belum ada kuis yang tersedia untuk kelas ini.</p>
                      </div>
                    ) : quizList.map((q, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1rem', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem',
                          }}>
                            Q
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                              {q.judul || q.title || 'Kuis'}
                            </h4>
                            <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.15rem 0 0 0' }}>
                              {q.tglIndo || q.tanggal || 'Tersedia'} {q.waktu ? `| Durasi: ${q.waktu} menit` : ''}
                            </p>
                          </div>
                        </div>
                        <a href={`https://ethol.pens.ac.id/mahasiswa/quiz/${q.id}`} target="_blank" rel="noopener noreferrer"
                          className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                          <ExternalLink size={14} /> Kerjakan
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
