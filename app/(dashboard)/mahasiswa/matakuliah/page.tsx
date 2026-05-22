'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { BookOpen, User, Calendar, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

export default function MahasiswaMatakuliahPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

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
    async function fetchCourses() {
      if (!user) return;
      try {
        const { data: supaMatkul, error } = await supabase
          .from('mata_kuliah')
          .select('*');

        if (!error && supaMatkul && supaMatkul.length > 0) {
          const mapped = supaMatkul.map((m: any, idx: number) => {
            const fb = realEtholCourses[idx % realEtholCourses.length];
            return {
              id: m.id,
              nama: m.nama,
              dosen: fb.dosen,
              sks: m.sks ?? 3,
              hari: fb.hari,
              jam: fb.jam,
              ruang: fb.ruang,
              kode: m.kode || fb.kode
            };
          });
          setCourses(mapped);
        } else {
          setCourses(realEtholCourses);
        }
      } catch (e) {
        console.error(e);
        setCourses(realEtholCourses);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [user]);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Mata Kuliah Semester Genap
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Daftar kelas aktif yang Anda ambil pada semester genap aktif PENS.
        </p>
      </div>

      {loading ? (
        <div className="p-6 text-muted">Memuat kelas aktif...</div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="card p-5"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--color-primary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {course.kode}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {course.sks} SKS
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  {course.nama}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} className="text-muted" />
                    <span>{course.dosen}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} className="text-muted" />
                    <span>{course.hari}, {course.jam}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} className="text-muted" />
                    <span>{course.ruang}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <Link
                  href={`/mahasiswa/kuliah/${course.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span>Akses Kuliah</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
