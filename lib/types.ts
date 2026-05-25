// ─── Shared Types ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'dosen_wali' | 'mahasiswa';

export interface PublicUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Mahasiswa {
  id: string;
  user_id: string;
  nrp: string;
  nama_lengkap: string;
  kelas: string;
  prodi: string;
  angkatan: number;
}

export interface DosenWali {
  id: string;
  user_id: string;
  nip: string;
  nama_lengkap: string;
  prodi: string;
}

// ─── View Types ───────────────────────────────────────────────────────────────

export interface RingkasanMahasiswa {
  id: string;
  nrp: string;
  nama_lengkap: string;
  kelas: string;
  prodi: string;
  angkatan: number;
  ipk_kumulatif: number;
  ips_terakhir: number;
  sks_kumulatif: number;
  avg_kehadiran: number;
  jumlah_alert_aktif: number;
  dosen_wali_nama: string | null;
}

export interface AlertAktif {
  id: string;
  nama_lengkap: string;
  nrp: string;
  tipe_alert: string;
  created_at: string;
}

export interface NilaiPerSemester {
  nama_matkul: string;
  sks: number;
  nilai_akhir: number;
  grade: string;
  bobot_nilai: number;
  semester_nama: string;
}

export interface KehadiranPerMatkul {
  nama_matkul: string;
  total_pertemuan: number;
  hadir: number;
  alpha: number;
  persentase: number;
}

export interface JadwalKonsultasi {
  id: string;
  mahasiswa_id: string;
  dosen_wali_id: string;
  semester_id?: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
  catatan?: string;
  lokasi?: string;
  dibuat_oleh: string;
}

export interface CasLoginRequest {
  netId: string;
  password: string;
}

export interface CasLoginResponse {
  success: boolean;
  email?: string;
  role?: UserRole;
  isNew?: boolean;
  message?: string;
  scrapedProfile?: {
    fullName: string | null;
    nrp: string | null;
    prodi: string | null;
    kelas: string | null;
  };
  scrapedNilai?: number;
  scrapedKehadiran?: number;
}

// ─── ETHOL API Types ───────────────────────────────────────────────────────────

export interface Quiz {
  id: number;
  judul: string;
  tglIndo: string;
  jenisSchema: number;
  courseName?: string;
  kuliah?: number;
  waktu?: number;
  durasi?: number;
}

export interface QuizSoal {
  kuis_soal_id: number;
  kuis_hasil_id: number;
  soal: string;
  pilihan: string[];
  jawaban_dipilih?: string;
  tipe_soal: 'pilihan_ganda' | 'pilihan_jamak';
}

export interface Exam {
  nomor: number;
  keterangan: string;
  matakuliah: string;
  tglIndonesia: string;
  tanggal: string;
  waktu: string;
  jenis?: string;
}

export interface ForumPost {
  id: number;
  narasi: string;
  namaPegawai?: string;
  nama_mahasiswa?: string;
  nama?: string;
  nrp?: string;
  waktu_indonesia?: string;
  tanggal?: string;
  komentar?: ForumComment[];
}

export interface ForumComment {
  id: number;
  narasi: string;
  nama?: string;
  waktu_indonesia?: string;
}

export interface EtholNotification {
  id: number;
  keterangan: string;
  status: string;
  urlWeb?: string;
  kodeNotifikasi: string;
  dataTerkait?: any;
  createdAt?: string;
  waktuNotifikasi?: string;
  createdAtIndonesia?: string;
}

export interface SupportTicket {
  nomor: number;
  judul: string;
  keterangan: string;
  status: string;
  tanggal: string;
  createdAt?: string;
  balasan?: SupportReply[];
}

export interface SupportReply {
  id: number;
  balasan: string;
  nama?: string;
  tipe?: string;
  waktu?: string;
}

export interface CourseMaterial {
  nomor: number;
  judul: string;
  keterangan?: string;
  path?: string;
  ekstensiFile?: string;
  createdIndonesia?: string;
  pertemuan?: number;
}

export interface CourseVideo {
  nomor: number;
  judul: string;
  keterangan?: string;
  url?: string;
  url_video?: string;
  image?: string;
}

export interface ScheduleEntry {
  kuliah: string;
  hari: string;
  jamAwal: string;
  jamAkhir: string;
  nomorHari: number;
  ruang?: string;
  matakuliah?: string;
}

export interface AttendanceRecord {
  nomor: number;
  waktuIndonesia?: string;
  key?: string;
  keterangan?: string;
  materi?: string;
  pertemuan?: number;
  isAbsent?: boolean;
}

export interface Participant {
  nama: string;
  nrp: string;
  hakAktif?: string;
  nomorPegawai?: string;
}

export interface WebSocketMessage {
  type: 'PRESENSI' | 'TUGAS' | 'MATERI' | 'PENGUMUMAN' | 'CHAT';
  data: any;
  idNotifikasi?: number;
  pesan?: string;
}
