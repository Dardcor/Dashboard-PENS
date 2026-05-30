import prisma from '../prisma';
import { 
  getEtholJwtToken, 
  getCourses, 
  getLatestAssignments, 
  getLatestAnnouncements, 
  getAttendanceHistory,
  getMaterials
} from '../ethol-api';

export async function syncEtholData(userId: string, cookie: string) {
  try {
    console.log(`[SYNC] Memulai sinkronisasi data ETHOL untuk user: ${userId}`);

    // 1. Dapatkan Token JWT
    const token = await getEtholJwtToken(cookie);
    if (!token) {
      throw new Error('Gagal mendapatkan token JWT ETHOL dari cookie yang diberikan. Sesi mungkin sudah habis.');
    }

    // 2. Ambil data User dan Mahasiswa terkait dari database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { mahasiswa: true }
    });

    if (!user || !user.mahasiswa) {
      throw new Error('User tidak ditemukan atau tidak tertaut dengan data Mahasiswa.');
    }

    const mahasiswaId = user.mahasiswa.id;
    const nrp = user.mahasiswa.nrp;

    // Default ke semester ganjil aktif (contoh fallback jika perlu query spesifik)
    // Sebaiknya mencari semester aktif dari database
    let semesterAktif = await prisma.semester.findFirst({
      where: { is_aktif: true },
      orderBy: { created_at: 'desc' }
    });

    if (!semesterAktif) {
      semesterAktif = await prisma.semester.findFirst({
        orderBy: { created_at: 'desc' }
      });
      
      if (semesterAktif) {
        semesterAktif = await prisma.semester.update({
          where: { id: semesterAktif.id },
          data: { is_aktif: true }
        });
        console.log('[SYNC] Mengaktifkan semester terbaru: ' + semesterAktif.nama);
      } else {
        semesterAktif = await prisma.semester.create({
          data: {
            kode: `FALLBACK-${Date.now()}`,
            nama: 'Semester Sinkronisasi Otomatis',
            tahun_akademik: `${new Date().getFullYear()}/${new Date().getFullYear()+1}`,
            tipe: 'ganjil',
            tanggal_mulai: new Date(),
            tanggal_selesai: new Date(new Date().setMonth(new Date().getMonth() + 6)),
            is_aktif: true
          }
        });
        console.log('[SYNC] Semester aktif otomatis dibuat.');
      }
    }

    // 3. Sinkronisasi Mata Kuliah
    console.log('[SYNC] Menarik data Mata Kuliah...');
    const coursesResponse = await getCourses(token);
    const courses = coursesResponse?.data || [];
    
    for (const course of courses) {
      // Pastikan ada ID dari ETHOL
      if (!course.id_kuliah) continue;

      const etholCourseId = String(course.id_kuliah);
      const namaMatkul = course.matakuliah || course.nama || 'Tanpa Nama';
      
      // Validasi apakah mata kuliah dengan nama tersebut sudah ada
      let existingMk = await prisma.mataKuliah.findFirst({
        where: { 
          OR: [
            { ethol_course_id: etholCourseId },
            { nama: { contains: namaMatkul.substring(0, 15) } }
          ]
        }
      });

      if (existingMk) {
        // Update existing mk
        await prisma.mataKuliah.update({
          where: { id: existingMk.id },
          data: {
            ethol_course_id: etholCourseId, // set ID if it was null
            nama: namaMatkul,
            sks: course.sks ? parseInt(course.sks) : existingMk.sks,
            dosen: course.dosen || existingMk.dosen,
            hari: course.hari || existingMk.hari,
            jam: course.jam || existingMk.jam,
            ruang: course.ruang || existingMk.ruang,
            kode: course.kode_mk || existingMk.kode
          }
        });
      } else {
        // Create new
        await prisma.mataKuliah.create({
          data: {
            ethol_course_id: etholCourseId,
            kode: course.kode_mk || `ETHOL-${course.id_kuliah}`,
            nama: namaMatkul,
            sks: course.sks ? parseInt(course.sks) : 0,
            prodi: user.mahasiswa.prodi,
            jurusan: user.mahasiswa.jurusan,
            dosen: course.dosen || 'Belum Ditentukan',
            hari: course.hari || '',
            jam: course.jam || '',
            ruang: course.ruang || ''
          }
        });
      }
    }

    // 4. Sinkronisasi Tugas (Assignments)
    console.log('[SYNC] Menarik data Tugas...');
    try {
      const assignmentsResponse = await getLatestAssignments(token);
      const assignments = assignmentsResponse?.data || [];

      for (const tugas of assignments) {
        if (!tugas.id_tugas) continue;
        
        // Cari mata kuliah berdasarkan nama tugas jika tidak ada id spesifik
        const mk = await prisma.mataKuliah.findFirst({
          where: { nama: { contains: tugas.matakuliah || '' } }
        });

        await prisma.tugas.upsert({
          where: { ethol_tugas_id: parseInt(tugas.id_tugas) },
          update: {
            judul: tugas.judul || 'Tugas Tanpa Judul',
            deskripsi: tugas.keterangan || '',
            deadline: tugas.waktu_selesai ? new Date(tugas.waktu_selesai) : null,
            status: tugas.waktu_kumpul ? 'Sudah mengumpulkan' : 'Belum mengumpulkan',
            sumber_ethol: JSON.stringify(tugas)
          },
          create: {
            ethol_tugas_id: parseInt(tugas.id_tugas),
            mahasiswa_id: mahasiswaId,
            mata_kuliah_id: mk?.id || null,
            judul: tugas.judul || 'Tugas Tanpa Judul',
            deskripsi: tugas.keterangan || '',
            deadline: tugas.waktu_selesai ? new Date(tugas.waktu_selesai) : null,
            status: tugas.waktu_kumpul ? 'Sudah mengumpulkan' : 'Belum mengumpulkan',
            sumber_ethol: JSON.stringify(tugas),
            color: 'blue'
          }
        });
      }
    } catch (e: any) {
      console.log(`[SYNC] Gagal menarik data Tugas: ${e.message}`);
    }

    // 5. Sinkronisasi Pengumuman
    console.log('[SYNC] Menarik data Pengumuman...');
    try {
      const annResponse = await getLatestAnnouncements(token);
      const announcements = annResponse?.data || [];

      for (const ann of announcements) {
        if (!ann.id_pengumuman) continue;

        await prisma.pengumuman.upsert({
          where: { ethol_pengumuman_id: parseInt(ann.id_pengumuman) },
          update: {
            judul: ann.judul || 'Tanpa Judul',
            isi: ann.pengumuman || '',
            tanggal: ann.waktu_mulai ? new Date(ann.waktu_mulai) : new Date(),
            publisher: ann.dosen || ann.oleh || 'ETHOL',
            file_url: ann.file ? `https://ethol.pens.ac.id/api/file/${ann.file}` : null
          },
          create: {
            ethol_pengumuman_id: parseInt(ann.id_pengumuman),
            judul: ann.judul || 'Tanpa Judul',
            isi: ann.pengumuman || '',
            tanggal: ann.waktu_mulai ? new Date(ann.waktu_mulai) : new Date(),
            publisher: ann.dosen || ann.oleh || 'ETHOL',
            file_url: ann.file ? `https://ethol.pens.ac.id/api/file/${ann.file}` : null
          }
        });
      }
    } catch (e: any) {
      console.log(`[SYNC] Gagal menarik data Pengumuman: ${e.message}`);
    }

    // 6. Menyimpan Kehadiran per Mata Kuliah (Opsional/Iterasi)
    console.log('[SYNC] Sinkronisasi Kehadiran & Materi...');
    const allCourses = await prisma.mataKuliah.findMany({
      where: { ethol_course_id: { not: null } }
    });

    for (const mk of allCourses) {
      if (!mk.ethol_course_id) continue;
      
      try {
        // Attendance History (riwayat)
        const attHistory = await getAttendanceHistory(token, parseInt(mk.ethol_course_id), nrp);
        
        if (attHistory && attHistory.data) {
           let totalPertemuan = 0;
           let hadir = 0, izin = 0, sakit = 0, alpha = 0;
           
           for (const record of attHistory.data) {
              totalPertemuan++;
              if (record.status_presensi === 'HADIR') hadir++;
              else if (record.status_presensi === 'IZIN') izin++;
              else if (record.status_presensi === 'SAKIT') sakit++;
              else alpha++;
           }
           
           await prisma.kehadiran.upsert({
             where: {
                mahasiswa_id_semester_id_mata_kuliah_id: {
                  mahasiswa_id: mahasiswaId,
                  semester_id: semesterAktif.id,
                  mata_kuliah_id: mk.id
                }
             },
             update: {
                total_pertemuan: totalPertemuan,
                hadir, izin, sakit, alpha,
                persentase_kehadiran: totalPertemuan > 0 ? (hadir / totalPertemuan) * 100 : 0
             },
             create: {
                mahasiswa_id: mahasiswaId,
                semester_id: semesterAktif.id,
                mata_kuliah_id: mk.id,
                total_pertemuan: totalPertemuan,
                hadir, izin, sakit, alpha,
                persentase_kehadiran: totalPertemuan > 0 ? (hadir / totalPertemuan) * 100 : 0
             }
           });
        }

        // Materials (Materi)
        const matResponse = await getMaterials(token, mk.nama, mk.dosen || '');
        for (const mat of matResponse) {
           if (!mat.id_materi) continue;
           
           await prisma.materi.upsert({
             where: { ethol_materi_id: parseInt(mat.id_materi) },
             update: {
                judul: mat.judul || 'Materi Tanpa Judul',
                deskripsi: mat.keterangan || '',
                tanggal: mat.waktu ? new Date(mat.waktu) : new Date(),
                file_name: mat.file || null
             },
             create: {
                ethol_materi_id: parseInt(mat.id_materi),
                mata_kuliah_id: mk.id,
                judul: mat.judul || 'Materi Tanpa Judul',
                deskripsi: mat.keterangan || '',
                tanggal: mat.waktu ? new Date(mat.waktu) : new Date(),
                file_name: mat.file || null
             }
           });
        }
      } catch (err) {
        // Teruskan ke MK selanjutnya jika gagal satu
        console.log(`[SYNC] Info: Gagal sinkronisasi mendalam untuk MK ${mk.nama}`);
      }
    }

    console.log('[SYNC] Sinkronisasi Selesai!');
    return { success: true, message: 'Data berhasil disinkronisasi ke database secara spesifik tanpa duplikasi.' };
  } catch (error: any) {
    console.error('[SYNC ERROR]', error);
    return { success: false, error: error.message };
  }
}
