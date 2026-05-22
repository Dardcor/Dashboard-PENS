// ─── Shared Types ─────────────────────────────────────────────────────────────

export type UserRole = 'dosen_wali' | 'mahasiswa';

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
