import prisma from '../prisma';
import { getMisHtml } from '../mis-api';
import { parseBiodata, parseKhs, parseKehadiran, parseJadwal, parsePengumuman } from '../scrapers/misParser';

const GRADE_ORDER: Record<string, number> = {
  'A': 4.0, 'AB': 3.5, 'B': 3.0, 'BC': 2.5,
  'C': 2.0, 'D': 1.0, 'E': 0.0
};

function convertGrade(grade: string) {
  const grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'];
  const upper = grade.toUpperCase().trim();
  if (grades.includes(upper)) return upper as any;
  return null;
}

function getBobotNilai(grade: string): number {
  return GRADE_ORDER[grade.toUpperCase().trim()] || 0;
}

function hashData(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function syncMisData(userId: string, cookie: string, semesterId?: string) {
  try {
    console.log(`[MIS SYNC] Memulai sinkronisasi data MIS untuk user: ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { mahasiswa: true }
    });

    if (!user || !user.mahasiswa) {
      throw new Error('User tidak ditemukan atau tidak tertaut dengan data Mahasiswa.');
    }

    const mahasiswaId = user.mahasiswa.id;

    let semester = semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId } })
      : await prisma.semester.findFirst({ where: { is_aktif: true }, orderBy: { created_at: 'desc' } });

    if (!semester) {
      semester = await prisma.semester.findFirst({ orderBy: { created_at: 'desc' } });
      if (!semester) throw new Error('Tidak ada semester ditemukan.');
    }

    const syncLog: string[] = [];

    // 1. Sync Biodata
    const biodataHtml = await getMisHtml('/mahasiswa/biodata.php', cookie);
    if (biodataHtml) {
      const biodata = parseBiodata(biodataHtml);
      syncLog.push(`Biodata parsed: ${Object.keys(biodata).length} fields`);

      if (biodata.nrp) {
        await prisma.mahasiswa.update({
          where: { id: mahasiswaId },
          data: {
            nama_lengkap: biodata.nama_lengkap || user.mahasiswa.nama_lengkap,
            alamat: biodata.alamat || user.mahasiswa.alamat,
            no_hp: biodata.no_hp || user.mahasiswa.no_hp,
            tempat_lahir: biodata.tempat_lahir,
            tanggal_lahir: biodata.tanggal_lahir ? new Date(biodata.tanggal_lahir) : undefined,
          }
        });
        syncLog.push('Biodata updated');
      }

      if (biodata.dosen_wali) {
        const dosenWali = await prisma.dosenWali.findFirst({
          where: { nama_lengkap: { contains: biodata.dosen_wali } }
        });
        if (dosenWali) {
          await prisma.mahasiswa.update({
            where: { id: mahasiswaId },
            data: { dosen_wali_id: dosenWali.id }
          });
          syncLog.push(`Dosen wali: ${biodata.dosen_wali}`);
        }
      }
    }

    // 2. Sync KHS (Nilai per semester)
    const khsHtml = await getMisHtml('/mahasiswa/khs.php', cookie);
    if (khsHtml) {
      const khs = parseKhs(khsHtml);
      syncLog.push(`KHS: ${khs.mata_kuliah.length} mata kuliah, IPS=${khs.ips}, IPK=${khs.ipk}`);

      // Update IPK history
      const existingIpk = await prisma.ipkHistory.findUnique({
        where: { mahasiswa_id_semester_id: { mahasiswa_id: mahasiswaId, semester_id: semester.id } }
      });

      const ipkData: any = {};
      if (khs.ips !== undefined) ipkData.ips = khs.ips;
      if (khs.ipk !== undefined) ipkData.ipk_kumulatif = khs.ipk;
      if (khs.sks_semester !== undefined) ipkData.sks_semester = khs.sks_semester;
      if (khs.sks_kumulatif !== undefined) ipkData.sks_kumulatif = khs.sks_kumulatif;

      if (existingIpk) {
        const existingHash = hashData(existingIpk);
        const newHash = hashData(ipkData);
        if (existingHash !== newHash) {
          await prisma.ipkHistory.update({
            where: { id: existingIpk.id },
            data: ipkData
          });
          syncLog.push('IPK history updated');
        }
      } else if (Object.keys(ipkData).length > 0) {
        await prisma.ipkHistory.create({
          data: {
            mahasiswa_id: mahasiswaId,
            semester_id: semester.id,
            ips: khs.ips || 0,
            ipk_kumulatif: khs.ipk || 0,
            sks_semester: khs.sks_semester || 0,
            sks_kumulatif: khs.sks_kumulatif || 0,
          }
        });
        syncLog.push('IPK history created');
      }

      // Upsert nilai setiap mata kuliah
      for (const mk of khs.mata_kuliah) {
        let matkul = await prisma.mataKuliah.findFirst({
          where: { kode: mk.kode }
        });

        if (!matkul) {
          matkul = await prisma.mataKuliah.findFirst({
            where: { nama: { contains: mk.nama.substring(0, 30) } }
          });
        }

        if (!matkul) {
          matkul = await prisma.mataKuliah.create({
            data: {
              kode: mk.kode,
              nama: mk.nama,
              sks: mk.sks,
              prodi: user.mahasiswa.prodi,
              jurusan: user.mahasiswa.jurusan,
            }
          });
        }

        const gradeEnum = convertGrade(mk.nilai_huruf);
        const existingNilai = await prisma.nilaiMahasiswa.findUnique({
          where: {
            mahasiswa_id_semester_id_mata_kuliah_id: {
              mahasiswa_id: mahasiswaId,
              semester_id: semester.id,
              mata_kuliah_id: matkul.id
            }
          }
        });

        if (existingNilai) {
          if (existingNilai.grade !== gradeEnum || existingNilai.bobot_nilai !== mk.bobot) {
            await prisma.nilaiMahasiswa.update({
              where: { id: existingNilai.id },
              data: { grade: gradeEnum, bobot_nilai: mk.bobot, nilai_akhir: mk.nilai_angka || undefined }
            });
          }
        } else {
          await prisma.nilaiMahasiswa.create({
            data: {
              mahasiswa_id: mahasiswaId,
              semester_id: semester.id,
              mata_kuliah_id: matkul.id,
              grade: gradeEnum,
              bobot_nilai: mk.bobot,
              nilai_akhir: mk.nilai_angka || undefined,
            }
          });
        }
      }
    }

    // 3. Sync Kehadiran
    const kehadiranHtml = await getMisHtml('/mahasiswa/absen.php', cookie);
    if (kehadiranHtml) {
      const kehadiranList = parseKehadiran(kehadiranHtml);
      syncLog.push(`Kehadiran: ${kehadiranList.length} mata kuliah`);

      for (const k of kehadiranList) {
        let matkul = await prisma.mataKuliah.findFirst({
          where: { kode: k.kode }
        });
        if (!matkul) {
          matkul = await prisma.mataKuliah.findFirst({
            where: { nama: { contains: k.nama.substring(0, 30) } }
          });
        }
        if (!matkul) continue;

        const existingKehadiran = await prisma.kehadiran.findUnique({
          where: {
            mahasiswa_id_semester_id_mata_kuliah_id: {
              mahasiswa_id: mahasiswaId,
              semester_id: semester.id,
              mata_kuliah_id: matkul.id
            }
          }
        });

        if (existingKehadiran) {
          if (existingKehadiran.hadir !== k.hadir || existingKehadiran.alpha !== k.alpha) {
            await prisma.kehadiran.update({
              where: { id: existingKehadiran.id },
              data: {
                total_pertemuan: k.total_pertemuan,
                hadir: k.hadir, izin: k.izin, sakit: k.sakit, alpha: k.alpha,
                persentase_kehadiran: k.persentase,
              }
            });
          }
        } else {
          await prisma.kehadiran.create({
            data: {
              mahasiswa_id: mahasiswaId,
              semester_id: semester.id,
              mata_kuliah_id: matkul.id,
              total_pertemuan: k.total_pertemuan,
              hadir: k.hadir, izin: k.izin, sakit: k.sakit, alpha: k.alpha,
              persentase_kehadiran: k.persentase,
            }
          });
        }
      }
    }

    // 4. Sync Jadwal Kuliah
    const jadwalHtml = await getMisHtml('/mahasiswa/jadwal.php', cookie);
    if (jadwalHtml) {
      const jadwalList = parseJadwal(jadwalHtml);
      syncLog.push(`Jadwal: ${jadwalList.length} mata kuliah`);

      for (const j of jadwalList) {
        let matkul = await prisma.mataKuliah.findFirst({
          where: { kode: j.kode }
        });
        if (!matkul) {
          matkul = await prisma.mataKuliah.findFirst({
            where: { nama: { contains: j.nama.substring(0, 30) } }
          });
        }
        if (!matkul) continue;

        const jam = j.jam_mulai && j.jam_selesai ? `${j.jam_mulai} - ${j.jam_selesai}` : undefined;
        const updateData: any = {};
        if (j.hari) updateData.hari = j.hari;
        if (jam) updateData.jam = jam;
        if (j.ruang) updateData.ruang = j.ruang;

        if (Object.keys(updateData).length > 0) {
          await prisma.mataKuliah.update({
            where: { id: matkul.id },
            data: updateData
          });
        }
      }
    }

    // 5. Sync Pengumuman
    const pengumumanHtml = await getMisHtml('/mahasiswa/pengumuman.php', cookie);
    if (pengumumanHtml) {
      const pengumumanList = parsePengumuman(pengumumanHtml);
      syncLog.push(`Pengumuman: ${pengumumanList.length} items`);

      for (const p of pengumumanList) {
        const existing = await prisma.pengumuman.findFirst({
          where: { judul: p.judul, tanggal: p.tanggal ? new Date(p.tanggal) : undefined }
        });

        if (!existing) {
          await prisma.pengumuman.create({
            data: {
              judul: p.judul,
              publisher: 'MIS PENS',
              tanggal: p.tanggal ? new Date(p.tanggal) : new Date(),
              isi: p.isi,
              sumber_url: p.sumber_url || '/mahasiswa/pengumuman.php',
            }
          });
        }
      }
    }

    // Update last sync timestamp
    await prisma.userEtholSession.upsert({
      where: { user_id: userId },
      update: { last_sync_at: new Date() },
      create: { user_id: userId, ethol_cookie: cookie, last_sync_at: new Date() }
    });

    console.log('[MIS SYNC] Selesai:', syncLog.join(' | '));
    return { success: true, message: 'Data MIS berhasil disinkronisasi tanpa duplikasi.', syncLog };

  } catch (error: any) {
    console.error('[MIS SYNC ERROR]', error);
    return { success: false, error: error.message };
  }
}
