CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  trig RECORD;
  pol RECORD;
BEGIN
  BEGIN
    ALTER TABLE IF EXISTS auth.users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS auth.identities DISABLE ROW LEVEL SECURITY;
    ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'auth' 
      AND tablename IN ('users', 'identities')
  LOOP
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON auth.' || quote_ident(pol.tablename) || ';';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  FOR trig IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass 
      AND NOT tgisinternal
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.tgname) || ' ON auth.users;';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_addr TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE LOWER(email) = LOWER(email_addr) LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'dosen_wali', 'mahasiswa'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE status_akademik AS ENUM (
  'aktif', 'cuti', 'mengundurkan_diri', 'drop_out', 'lulus'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE tipe_semester AS ENUM ('ganjil', 'genap', 'pendek'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE jenis_matkul AS ENUM ('wajib', 'pilihan', 'praktikum'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE grade_nilai AS ENUM ('A', 'AB', 'B', 'BC', 'C', 'D', 'E'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE tipe_alert AS ENUM (
  'nilai_rendah', 'kehadiran_buruk', 'ipk_turun', 'sks_tidak_cukup', 'belum_konsultasi'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE status_alert AS ENUM ('aktif', 'diproses', 'selesai', 'diabaikan'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE status_notif AS ENUM ('belum_dibaca', 'sudah_dibaca'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE tipe_notif AS ENUM ('alert', 'pengingat', 'info', 'jadwal'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE status_catatan AS ENUM ('draft', 'final'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE status_jadwal AS ENUM ('menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'mahasiswa',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dosen_wali (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nip           TEXT NOT NULL UNIQUE,
  nama_lengkap  TEXT NOT NULL,
  gelar_depan   TEXT,
  gelar_belakang TEXT,
  prodi         TEXT NOT NULL,
  jurusan       TEXT NOT NULL DEFAULT 'Teknik Informatika',
  no_hp         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mahasiswa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  dosen_wali_id   UUID REFERENCES public.dosen_wali(id) ON DELETE SET NULL,
  nrp             TEXT NOT NULL UNIQUE,
  nama_lengkap    TEXT NOT NULL,
  kelas           TEXT NOT NULL,
  prodi           TEXT NOT NULL,
  jurusan         TEXT NOT NULL DEFAULT 'Teknik Informatika',
  angkatan        INT NOT NULL CHECK (angkatan >= 2000 AND angkatan <= 2100),
  status_akademik status_akademik NOT NULL DEFAULT 'aktif',
  no_hp           TEXT,
  alamat          TEXT,
  tanggal_lahir   DATE,
  tempat_lahir    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.semester (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode            TEXT NOT NULL UNIQUE,
  nama            TEXT NOT NULL,
  tahun_akademik  TEXT NOT NULL,
  tipe            tipe_semester NOT NULL,
  tanggal_mulai   DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  is_aktif        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_semester_tanggal CHECK (tanggal_selesai > tanggal_mulai)
);

CREATE TABLE IF NOT EXISTS public.mata_kuliah (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  sks         INT NOT NULL CHECK (sks > 0 AND sks <= 6),
  prodi       TEXT NOT NULL,
  jurusan     TEXT NOT NULL DEFAULT 'Teknik Informatika',
  jenis       jenis_matkul NOT NULL DEFAULT 'wajib',
  dosen       TEXT DEFAULT 'Dosen Pengampu',
  hari        TEXT DEFAULT 'Sesuai Jadwal',
  jam         TEXT DEFAULT 'Sesuai Jadwal',
  ruang       TEXT DEFAULT 'Kelas Virtual / Offline',
  deskripsi   TEXT,
  ethol_course_id TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nilai_mahasiswa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id    UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  semester_id     UUID NOT NULL REFERENCES public.semester(id) ON DELETE RESTRICT,
  mata_kuliah_id  UUID NOT NULL REFERENCES public.mata_kuliah(id) ON DELETE RESTRICT,
  nilai_tugas     NUMERIC(5,2) CHECK (nilai_tugas >= 0 AND nilai_tugas <= 100),
  nilai_uts       NUMERIC(5,2) CHECK (nilai_uts >= 0 AND nilai_uts <= 100),
  nilai_uas       NUMERIC(5,2) CHECK (nilai_uas >= 0 AND nilai_uas <= 100),
  nilai_akhir     NUMERIC(5,2) GENERATED ALWAYS AS (
                    ROUND(
                      COALESCE(nilai_tugas, 0) * 0.30 +
                      COALESCE(nilai_uts, 0)   * 0.35 +
                      COALESCE(nilai_uas, 0)   * 0.35,
                      2
                    )
                  ) STORED,
  grade           grade_nilai,
  bobot_nilai     NUMERIC(3,2) CHECK (bobot_nilai >= 0 AND bobot_nilai <= 4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mahasiswa_id, semester_id, mata_kuliah_id)
);

CREATE TABLE IF NOT EXISTS public.kehadiran (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id          UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  semester_id           UUID NOT NULL REFERENCES public.semester(id) ON DELETE RESTRICT,
  mata_kuliah_id        UUID NOT NULL REFERENCES public.mata_kuliah(id) ON DELETE RESTRICT,
  total_pertemuan       INT NOT NULL DEFAULT 0 CHECK (total_pertemuan >= 0),
  hadir                 INT NOT NULL DEFAULT 0 CHECK (hadir >= 0),
  izin                  INT NOT NULL DEFAULT 0 CHECK (izin >= 0),
  sakit                 INT NOT NULL DEFAULT 0 CHECK (sakit >= 0),
  alpha                 INT NOT NULL DEFAULT 0 CHECK (alpha >= 0),
  persentase_kehadiran  NUMERIC(5,2) GENERATED ALWAYS AS (
                          CASE
                            WHEN total_pertemuan = 0 THEN 0
                            ELSE ROUND((hadir::NUMERIC / total_pertemuan) * 100, 2)
                          END
                        ) STORED,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mahasiswa_id, semester_id, mata_kuliah_id),
  CONSTRAINT chk_kehadiran_total CHECK (
    hadir + izin + sakit + alpha <= total_pertemuan
  )
);

CREATE TABLE IF NOT EXISTS public.ipk_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id    UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  semester_id     UUID NOT NULL REFERENCES public.semester(id) ON DELETE RESTRICT,
  ips             NUMERIC(4,2) NOT NULL CHECK (ips >= 0 AND ips <= 4),
  ipk_kumulatif   NUMERIC(4,2) NOT NULL CHECK (ipk_kumulatif >= 0 AND ipk_kumulatif <= 4),
  sks_semester    INT NOT NULL CHECK (sks_semester >= 0),
  sks_kumulatif   INT NOT NULL CHECK (sks_kumulatif >= 0),
  sks_lulus       INT NOT NULL DEFAULT 0 CHECK (sks_lulus >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mahasiswa_id, semester_id)
);

CREATE TABLE IF NOT EXISTS public.catatan_perwalian (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id    UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  dosen_wali_id   UUID NOT NULL REFERENCES public.dosen_wali(id) ON DELETE RESTRICT,
  semester_id     UUID NOT NULL REFERENCES public.semester(id) ON DELETE RESTRICT,
  judul           TEXT NOT NULL,
  isi_catatan     TEXT NOT NULL,
  tindak_lanjut   TEXT,
  status          status_catatan NOT NULL DEFAULT 'draft',
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_akademik (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id    UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  semester_id     UUID NOT NULL REFERENCES public.semester(id) ON DELETE RESTRICT,
  tipe_alert      tipe_alert NOT NULL,
  deskripsi       TEXT NOT NULL,
  status          status_alert NOT NULL DEFAULT 'aktif',
  threshold_value NUMERIC(8,2),
  actual_value    NUMERIC(8,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.notifikasi (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mahasiswa_id  UUID REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  alert_id      UUID REFERENCES public.alert_akademik(id) ON DELETE SET NULL,
  judul         TEXT NOT NULL,
  pesan         TEXT NOT NULL,
  tipe          tipe_notif NOT NULL DEFAULT 'info',
  status        status_notif NOT NULL DEFAULT 'belum_dibaca',
  link_target   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dibaca_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.jadwal_konsultasi (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id    UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  dosen_wali_id   UUID NOT NULL REFERENCES public.dosen_wali(id) ON DELETE RESTRICT,
  semester_id     UUID REFERENCES public.semester(id) ON DELETE SET NULL,
  waktu_mulai     TIMESTAMPTZ NOT NULL,
  waktu_selesai   TIMESTAMPTZ NOT NULL,
  status          status_jadwal NOT NULL DEFAULT 'menunggu',
  catatan         TEXT,
  lokasi          TEXT,
  dibuat_oleh     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_jadwal_waktu CHECK (waktu_selesai > waktu_mulai)
);

CREATE TABLE IF NOT EXISTS public.konfigurasi_alert (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipe_alert      tipe_alert NOT NULL UNIQUE,
  nama            TEXT NOT NULL,
  deskripsi       TEXT,
  threshold_value NUMERIC(8,2) NOT NULL,
  is_aktif        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.konfigurasi_alert (tipe_alert, nama, deskripsi, threshold_value) VALUES
  ('nilai_rendah',       'Nilai Rendah',          'Alert jika nilai akhir matkul di bawah threshold', 60.00),
  ('kehadiran_buruk',    'Kehadiran Buruk',        'Alert jika persentase kehadiran di bawah threshold', 75.00),
  ('ipk_turun',          'IPK Menurun',            'Alert jika IPK turun lebih dari threshold poin', 0.50),
  ('sks_tidak_cukup',    'SKS Tidak Cukup',        'Alert jika SKS diambil di bawah threshold per semester', 12),
  ('belum_konsultasi',   'Belum Konsultasi',       'Alert jika belum ada catatan perwalian dalam N hari', 60)
ON CONFLICT (tipe_alert) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_mahasiswa_dosen_wali ON public.mahasiswa(dosen_wali_id);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_nrp ON public.mahasiswa(nrp);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_status ON public.mahasiswa(status_akademik);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_angkatan ON public.mahasiswa(angkatan);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_prodi ON public.mahasiswa(prodi);

CREATE INDEX IF NOT EXISTS idx_nilai_mahasiswa ON public.nilai_mahasiswa(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_nilai_semester ON public.nilai_mahasiswa(semester_id);
CREATE INDEX IF NOT EXISTS idx_nilai_matkul ON public.nilai_mahasiswa(mata_kuliah_id);
CREATE INDEX IF NOT EXISTS idx_nilai_grade ON public.nilai_mahasiswa(grade);

CREATE INDEX IF NOT EXISTS idx_kehadiran_mahasiswa ON public.kehadiran(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_semester ON public.kehadiran(semester_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_persen ON public.kehadiran(persentase_kehadiran);

CREATE INDEX IF NOT EXISTS idx_ipk_mahasiswa ON public.ipk_history(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_ipk_semester ON public.ipk_history(semester_id);

CREATE INDEX IF NOT EXISTS idx_alert_mahasiswa ON public.alert_akademik(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_alert_status ON public.alert_akademik(status);
CREATE INDEX IF NOT EXISTS idx_alert_tipe ON public.alert_akademik(tipe_alert);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifikasi(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_status ON public.notifikasi(status);
CREATE INDEX IF NOT EXISTS idx_notif_created ON public.notifikasi(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catatan_mahasiswa ON public.catatan_perwalian(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_catatan_dosen ON public.catatan_perwalian(dosen_wali_id);
CREATE INDEX IF NOT EXISTS idx_catatan_semester ON public.catatan_perwalian(semester_id);

CREATE INDEX IF NOT EXISTS idx_jadwal_mahasiswa ON public.jadwal_konsultasi(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_dosen ON public.jadwal_konsultasi(dosen_wali_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_waktu ON public.jadwal_konsultasi(waktu_mulai);
CREATE INDEX IF NOT EXISTS idx_jadwal_status ON public.jadwal_konsultasi(status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_dosen_wali_updated_at ON public.dosen_wali;
CREATE TRIGGER trg_dosen_wali_updated_at
  BEFORE UPDATE ON public.dosen_wali
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mahasiswa_updated_at ON public.mahasiswa;
CREATE TRIGGER trg_mahasiswa_updated_at
  BEFORE UPDATE ON public.mahasiswa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mata_kuliah_updated_at ON public.mata_kuliah;
CREATE TRIGGER trg_mata_kuliah_updated_at
  BEFORE UPDATE ON public.mata_kuliah
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_nilai_updated_at ON public.nilai_mahasiswa;
CREATE TRIGGER trg_nilai_updated_at
  BEFORE UPDATE ON public.nilai_mahasiswa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_catatan_updated_at ON public.catatan_perwalian;
CREATE TRIGGER trg_catatan_updated_at
  BEFORE UPDATE ON public.catatan_perwalian
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_jadwal_updated_at ON public.jadwal_konsultasi;
CREATE TRIGGER trg_jadwal_updated_at
  BEFORE UPDATE ON public.jadwal_konsultasi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_grade_bobot()
RETURNS TRIGGER AS $$
DECLARE
  na NUMERIC;
BEGIN
  na := ROUND(
    COALESCE(NEW.nilai_tugas, 0) * 0.30 +
    COALESCE(NEW.nilai_uts, 0)   * 0.35 +
    COALESCE(NEW.nilai_uas, 0)   * 0.35,
    2
  );
  IF na >= 87 THEN
    NEW.grade := 'A';  NEW.bobot_nilai := 4.00;
  ELSIF na >= 78 THEN
    NEW.grade := 'AB'; NEW.bobot_nilai := 3.50;
  ELSIF na >= 69 THEN
    NEW.grade := 'B';  NEW.bobot_nilai := 3.00;
  ELSIF na >= 60 THEN
    NEW.grade := 'BC'; NEW.bobot_nilai := 2.50;
  ELSIF na >= 51 THEN
    NEW.grade := 'C';  NEW.bobot_nilai := 2.00;
  ELSIF na >= 41 THEN
    NEW.grade := 'D';  NEW.bobot_nilai := 1.00;
  ELSE
    NEW.grade := 'E';  NEW.bobot_nilai := 0.00;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_grade_bobot ON public.nilai_mahasiswa;
CREATE TRIGGER trg_set_grade_bobot
  BEFORE INSERT OR UPDATE ON public.nilai_mahasiswa
  FOR EACH ROW EXECUTE FUNCTION public.set_grade_bobot();


CREATE OR REPLACE FUNCTION public.check_alert_kehadiran()
RETURNS TRIGGER AS $$
DECLARE
  threshold NUMERIC;
BEGIN
  SELECT threshold_value INTO threshold
  FROM public.konfigurasi_alert
  WHERE tipe_alert = 'kehadiran_buruk' AND is_aktif = TRUE;

  IF threshold IS NOT NULL AND NEW.persentase_kehadiran < threshold THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.alert_akademik
      WHERE mahasiswa_id = NEW.mahasiswa_id
        AND semester_id = NEW.semester_id
        AND tipe_alert = 'kehadiran_buruk'
        AND status = 'aktif'
    ) THEN
      INSERT INTO public.alert_akademik
        (mahasiswa_id, semester_id, tipe_alert, deskripsi, threshold_value, actual_value)
      VALUES (
        NEW.mahasiswa_id,
        NEW.semester_id,
        'kehadiran_buruk',
        'Persentase kehadiran di bawah ' || threshold || '%',
        threshold,
        NEW.persentase_kehadiran
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_kehadiran_alert ON public.kehadiran;
CREATE TRIGGER trg_check_kehadiran_alert
  AFTER INSERT OR UPDATE ON public.kehadiran
  FOR EACH ROW EXECUTE FUNCTION public.check_alert_kehadiran();


CREATE OR REPLACE FUNCTION public.check_alert_nilai()
RETURNS TRIGGER AS $$
DECLARE
  threshold NUMERIC;
  na NUMERIC;
BEGIN
  SELECT threshold_value INTO threshold
  FROM public.konfigurasi_alert
  WHERE tipe_alert = 'nilai_rendah' AND is_aktif = TRUE;

  na := ROUND(
    COALESCE(NEW.nilai_tugas, 0) * 0.30 +
    COALESCE(NEW.nilai_uts, 0)   * 0.35 +
    COALESCE(NEW.nilai_uas, 0)   * 0.35,
    2
  );

  IF threshold IS NOT NULL AND na < threshold THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.alert_akademik
      WHERE mahasiswa_id = NEW.mahasiswa_id
        AND semester_id = NEW.semester_id
        AND tipe_alert = 'nilai_rendah'
        AND status = 'aktif'
    ) THEN
      INSERT INTO public.alert_akademik
        (mahasiswa_id, semester_id, tipe_alert, deskripsi, threshold_value, actual_value)
      VALUES (
        NEW.mahasiswa_id,
        NEW.semester_id,
        'nilai_rendah',
        'Terdapat nilai akhir matkul di bawah ' || threshold,
        threshold,
        na
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_nilai_alert ON public.nilai_mahasiswa;
CREATE TRIGGER trg_check_nilai_alert
  AFTER INSERT OR UPDATE ON public.nilai_mahasiswa
  FOR EACH ROW EXECUTE FUNCTION public.check_alert_nilai();

CREATE OR REPLACE VIEW public.v_ringkasan_mahasiswa AS
SELECT
  m.id,
  m.nrp,
  m.nama_lengkap,
  m.kelas,
  m.prodi,
  m.angkatan,
  m.status_akademik,
  dw.nama_lengkap    AS dosen_wali_nama,
  ipk.ipk_kumulatif,
  ipk.ips            AS ips_terakhir,
  ipk.sks_kumulatif,
  ROUND(AVG(k.persentase_kehadiran), 2) AS avg_kehadiran,
  (
    SELECT COUNT(*) FROM public.alert_akademik aa
    WHERE aa.mahasiswa_id = m.id AND aa.status = 'aktif'
  ) AS jumlah_alert_aktif
FROM public.mahasiswa m
LEFT JOIN public.dosen_wali dw ON dw.id = m.dosen_wali_id
LEFT JOIN LATERAL (
  SELECT * FROM public.ipk_history
  WHERE mahasiswa_id = m.id
  ORDER BY created_at DESC LIMIT 1
) ipk ON TRUE
LEFT JOIN public.semester s ON s.is_aktif = TRUE
LEFT JOIN public.kehadiran k ON k.mahasiswa_id = m.id AND k.semester_id = s.id
GROUP BY m.id, m.nrp, m.nama_lengkap, m.kelas, m.prodi, m.angkatan,
         m.status_akademik, dw.nama_lengkap, ipk.ipk_kumulatif, ipk.ips, ipk.sks_kumulatif;

CREATE OR REPLACE VIEW public.v_nilai_per_semester AS
SELECT
  nm.mahasiswa_id,
  m.nama_lengkap,
  m.nrp,
  s.nama            AS semester,
  s.kode            AS kode_semester,
  mk.kode           AS kode_matkul,
  mk.nama           AS nama_matkul,
  mk.sks,
  nm.nilai_tugas,
  nm.nilai_uts,
  nm.nilai_uas,
  nm.nilai_akhir,
  nm.grade,
  nm.bobot_nilai
FROM public.nilai_mahasiswa nm
JOIN public.mahasiswa m      ON m.id = nm.mahasiswa_id
JOIN public.semester s       ON s.id = nm.semester_id
JOIN public.mata_kuliah mk   ON mk.id = nm.mata_kuliah_id;

CREATE OR REPLACE VIEW public.v_kehadiran_per_semester AS
SELECT
  k.mahasiswa_id,
  m.nama_lengkap,
  m.nrp,
  s.nama            AS semester,
  mk.nama           AS mata_kuliah,
  k.total_pertemuan,
  k.hadir,
  k.izin,
  k.sakit,
  k.alpha,
  k.persentase_kehadiran,
  CASE
    WHEN k.persentase_kehadiran >= 80 THEN 'aman'
    WHEN k.persentase_kehadiran >= 75 THEN 'peringatan'
    ELSE 'berbahaya'
  END AS status_kehadiran
FROM public.kehadiran k
JOIN public.mahasiswa m     ON m.id = k.mahasiswa_id
JOIN public.semester s      ON s.id = k.semester_id
JOIN public.mata_kuliah mk  ON mk.id = k.mata_kuliah_id;


CREATE OR REPLACE VIEW public.v_alert_aktif AS
SELECT
  aa.id,
  aa.tipe_alert,
  aa.deskripsi,
  aa.threshold_value,
  aa.actual_value,
  aa.created_at,
  m.id              AS mahasiswa_id,
  m.nrp,
  m.nama_lengkap,
  m.kelas,
  dw.nama_lengkap   AS dosen_wali_nama,
  dw.id             AS dosen_wali_id,
  s.nama            AS semester
FROM public.alert_akademik aa
JOIN public.mahasiswa m   ON m.id = aa.mahasiswa_id
JOIN public.semester s    ON s.id = aa.semester_id
LEFT JOIN public.dosen_wali dw ON dw.id = m.dosen_wali_id
WHERE aa.status = 'aktif';


ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dosen_wali          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahasiswa           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_kuliah         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai_mahasiswa     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kehadiran           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipk_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catatan_perwalian   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_akademik      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifikasi          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_konsultasi   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.konfigurasi_alert   ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::public.user_role,
    'mahasiswa'::public.user_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_dosen_wali_id()
RETURNS UUID AS $$
  SELECT id FROM public.dosen_wali WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_mahasiswa_id()
RETURNS UUID AS $$
  SELECT id FROM public.mahasiswa WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "users: lihat profil sendiri" ON public.users;
CREATE POLICY "users: lihat profil sendiri"
  ON public.users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users: admin lihat semua" ON public.users;
CREATE POLICY "users: admin lihat semua"
  ON public.users FOR SELECT
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "users: update profil sendiri" ON public.users;
CREATE POLICY "users: update profil sendiri"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "dosen_wali: lihat data sendiri" ON public.dosen_wali;
CREATE POLICY "dosen_wali: lihat data sendiri"
  ON public.dosen_wali FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dosen_wali: mahasiswa lihat semua dosen" ON public.dosen_wali;
CREATE POLICY "dosen_wali: mahasiswa lihat semua dosen"
  ON public.dosen_wali FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "dosen_wali: admin full access" ON public.dosen_wali;
CREATE POLICY "dosen_wali: admin full access"
  ON public.dosen_wali FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "mahasiswa: lihat data sendiri" ON public.mahasiswa;
CREATE POLICY "mahasiswa: lihat data sendiri"
  ON public.mahasiswa FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "mahasiswa: dosen wali lihat binaan" ON public.mahasiswa;
CREATE POLICY "mahasiswa: dosen wali lihat binaan"
  ON public.mahasiswa FOR SELECT
  USING (
    dosen_wali_id = public.get_current_dosen_wali_id()
  );

DROP POLICY IF EXISTS "mahasiswa: admin full access" ON public.mahasiswa;
CREATE POLICY "mahasiswa: admin full access"
  ON public.mahasiswa FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "nilai: mahasiswa lihat nilai sendiri" ON public.nilai_mahasiswa;
CREATE POLICY "nilai: mahasiswa lihat nilai sendiri"
  ON public.nilai_mahasiswa FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "nilai: dosen wali lihat nilai binaan" ON public.nilai_mahasiswa;
CREATE POLICY "nilai: dosen wali lihat nilai binaan"
  ON public.nilai_mahasiswa FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mahasiswa
      WHERE id = nilai_mahasiswa.mahasiswa_id
        AND dosen_wali_id = public.get_current_dosen_wali_id()
    )
  );

DROP POLICY IF EXISTS "nilai: admin full access" ON public.nilai_mahasiswa;
CREATE POLICY "nilai: admin full access"
  ON public.nilai_mahasiswa FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "kehadiran: mahasiswa lihat sendiri" ON public.kehadiran;
CREATE POLICY "kehadiran: mahasiswa lihat sendiri"
  ON public.kehadiran FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "kehadiran: dosen wali lihat binaan" ON public.kehadiran;
CREATE POLICY "kehadiran: dosen wali lihat binaan"
  ON public.kehadiran FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mahasiswa
      WHERE id = kehadiran.mahasiswa_id
        AND dosen_wali_id = public.get_current_dosen_wali_id()
    )
  );

DROP POLICY IF EXISTS "kehadiran: admin full access" ON public.kehadiran;
CREATE POLICY "kehadiran: admin full access"
  ON public.kehadiran FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "notifikasi: user lihat milik sendiri" ON public.notifikasi;
CREATE POLICY "notifikasi: user lihat milik sendiri"
  ON public.notifikasi FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifikasi: user update milik sendiri" ON public.notifikasi;
CREATE POLICY "notifikasi: user update milik sendiri"
  ON public.notifikasi FOR UPDATE
  USING (user_id = auth.uid());


DROP POLICY IF EXISTS "catatan: dosen wali kelola catatan sendiri" ON public.catatan_perwalian;
CREATE POLICY "catatan: dosen wali kelola catatan sendiri"
  ON public.catatan_perwalian FOR ALL
  USING (dosen_wali_id = public.get_current_dosen_wali_id());

DROP POLICY IF EXISTS "catatan: mahasiswa lihat catatan sendiri" ON public.catatan_perwalian;
CREATE POLICY "catatan: mahasiswa lihat catatan sendiri"
  ON public.catatan_perwalian FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "catatan: admin full access" ON public.catatan_perwalian;
CREATE POLICY "catatan: admin full access"
  ON public.catatan_perwalian FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "alert: dosen wali lihat alert binaan" ON public.alert_akademik;
CREATE POLICY "alert: dosen wali lihat alert binaan"
  ON public.alert_akademik FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mahasiswa
      WHERE id = alert_akademik.mahasiswa_id
        AND dosen_wali_id = public.get_current_dosen_wali_id()
    )
  );

DROP POLICY IF EXISTS "alert: mahasiswa lihat alert sendiri" ON public.alert_akademik;
CREATE POLICY "alert: mahasiswa lihat alert sendiri"
  ON public.alert_akademik FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "alert: admin full access" ON public.alert_akademik;
CREATE POLICY "alert: admin full access"
  ON public.alert_akademik FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "semester: semua bisa baca" ON public.semester;
CREATE POLICY "semester: semua bisa baca"
  ON public.semester FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "matkul: semua bisa baca" ON public.mata_kuliah;
CREATE POLICY "matkul: semua bisa baca"
  ON public.mata_kuliah FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "konfigurasi_alert: admin full access" ON public.konfigurasi_alert;
CREATE POLICY "konfigurasi_alert: admin full access"
  ON public.konfigurasi_alert FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "konfigurasi_alert: semua bisa baca" ON public.konfigurasi_alert;
CREATE POLICY "konfigurasi_alert: semua bisa baca"
  ON public.konfigurasi_alert FOR SELECT
  USING (TRUE);


DROP POLICY IF EXISTS "jadwal: mahasiswa lihat jadwal sendiri" ON public.jadwal_konsultasi;
CREATE POLICY "jadwal: mahasiswa lihat jadwal sendiri"
  ON public.jadwal_konsultasi FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "jadwal: dosen wali kelola jadwal sendiri" ON public.jadwal_konsultasi;
CREATE POLICY "jadwal: dosen wali kelola jadwal sendiri"
  ON public.jadwal_konsultasi FOR ALL
  USING (dosen_wali_id = public.get_current_dosen_wali_id());

DROP POLICY IF EXISTS "jadwal: admin full access" ON public.jadwal_konsultasi;
CREATE POLICY "jadwal: admin full access"
  ON public.jadwal_konsultasi FOR ALL
  USING (public.get_current_user_role() = 'admin');


DROP POLICY IF EXISTS "ipk: mahasiswa lihat sendiri" ON public.ipk_history;
CREATE POLICY "ipk: mahasiswa lihat sendiri"
  ON public.ipk_history FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "ipk: dosen wali lihat binaan" ON public.ipk_history;
CREATE POLICY "ipk: dosen wali lihat binaan"
  ON public.ipk_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mahasiswa
      WHERE id = ipk_history.mahasiswa_id
        AND dosen_wali_id = public.get_current_dosen_wali_id()
    )
  );

DROP POLICY IF EXISTS "ipk: admin full access" ON public.ipk_history;
CREATE POLICY "ipk: admin full access"
  ON public.ipk_history FOR ALL
  USING (public.get_current_user_role() = 'admin');


INSERT INTO public.semester (kode, nama, tahun_akademik, tipe, tanggal_mulai, tanggal_selesai, is_aktif)
VALUES
  ('2024/2025-1', 'Semester Ganjil 2024/2025', '2024/2025', 'ganjil', '2024-09-01', '2025-01-31', FALSE),
  ('2024/2025-2', 'Semester Genap 2024/2025',  '2024/2025', 'genap',  '2025-02-01', '2025-07-31', FALSE),
  ('2025/2026-1', 'Semester Ganjil 2025/2026', '2025/2026', 'ganjil', '2025-09-01', '2026-01-31', FALSE),
  ('2025/2026-2', 'Semester Genap 2025/2026',  '2025/2026', 'genap',  '2026-02-01', '2026-07-31', TRUE)
ON CONFLICT (kode) DO UPDATE
  SET is_aktif = EXCLUDED.is_aktif,
      tanggal_mulai   = EXCLUDED.tanggal_mulai,
      tanggal_selesai = EXCLUDED.tanggal_selesai;

UPDATE public.semester SET is_aktif = FALSE WHERE kode != '2025/2026-2';
UPDATE public.semester SET is_aktif = TRUE  WHERE kode  = '2025/2026-2';

CREATE TABLE IF NOT EXISTS public.user_ethol_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  ethol_cookie TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_ethol_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ethol_sessions: user access own" ON public.user_ethol_sessions;
CREATE POLICY "ethol_sessions: user access own"
  ON public.user_ethol_sessions FOR ALL
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_ethol_sessions_updated_at ON public.user_ethol_sessions;
CREATE TRIGGER trg_ethol_sessions_updated_at
  BEFORE UPDATE ON public.user_ethol_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tugas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  mata_kuliah_id UUID NOT NULL REFERENCES public.mata_kuliah(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Belum mengumpulkan',
  color TEXT DEFAULT '#ef4444',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tugas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tugas: mahasiswa lihat sendiri" ON public.tugas;
CREATE POLICY "tugas: mahasiswa lihat sendiri"
  ON public.tugas FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP TRIGGER IF EXISTS trg_tugas_updated_at ON public.tugas;
CREATE TRIGGER trg_tugas_updated_at
  BEFORE UPDATE ON public.tugas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.pengumuman (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul TEXT NOT NULL,
  publisher TEXT NOT NULL,
  tanggal DATE NOT NULL,
  file_name TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pengumuman: semua bisa baca" ON public.pengumuman;
CREATE POLICY "pengumuman: semua bisa baca"
  ON public.pengumuman FOR SELECT
  USING (TRUE);

DROP TRIGGER IF EXISTS trg_pengumuman_updated_at ON public.pengumuman;
CREATE TRIGGER trg_pengumuman_updated_at
  BEFORE UPDATE ON public.pengumuman
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.v_kehadiran_per_matkul AS
SELECT
  k.mahasiswa_id,
  m.nama_lengkap,
  m.nrp,
  mk.nama           AS nama_matkul,
  k.total_pertemuan,
  k.hadir,
  k.izin,
  k.sakit,
  k.alpha,
  k.persentase_kehadiran AS persentase
FROM public.kehadiran k
JOIN public.mahasiswa m     ON m.id = k.mahasiswa_id
JOIN public.mata_kuliah mk  ON mk.id = k.mata_kuliah_id;

DROP POLICY IF EXISTS "kehadiran_matkul: mahasiswa lihat sendiri" ON public.kehadiran;

CREATE OR REPLACE FUNCTION public.ensure_tables_exist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  CREATE TABLE IF NOT EXISTS public.user_ethol_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    ethol_cookie TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE public.user_ethol_sessions ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.tugas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
    mata_kuliah_id UUID REFERENCES public.mata_kuliah(id) ON DELETE SET NULL,
    judul TEXT NOT NULL,
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Belum mengumpulkan',
    color TEXT DEFAULT '#ef4444',
    sumber_ethol TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE public.tugas ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul TEXT NOT NULL,
    publisher TEXT NOT NULL DEFAULT 'PENS',
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    isi TEXT,
    file_name TEXT,
    file_url TEXT,
    sumber_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "ethol_sessions: user access own" ON public.user_ethol_sessions;
  CREATE POLICY "ethol_sessions: user access own"
    ON public.user_ethol_sessions FOR ALL USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "tugas: mahasiswa lihat sendiri" ON public.tugas;
  CREATE POLICY "tugas: mahasiswa lihat sendiri"
    ON public.tugas FOR SELECT USING (mahasiswa_id = public.get_current_mahasiswa_id());

  DROP POLICY IF EXISTS "pengumuman: semua bisa baca" ON public.pengumuman;
  CREATE POLICY "pengumuman: semua bisa baca"
    ON public.pengumuman FOR SELECT USING (TRUE);

  DROP TRIGGER IF EXISTS trg_ethol_sessions_updated_at ON public.user_ethol_sessions;
  CREATE TRIGGER trg_ethol_sessions_updated_at
    BEFORE UPDATE ON public.user_ethol_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trg_tugas_updated_at ON public.tugas;
  CREATE TRIGGER trg_tugas_updated_at
    BEFORE UPDATE ON public.tugas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trg_pengumuman_updated_at ON public.pengumuman;
  CREATE TRIGGER trg_pengumuman_updated_at
    BEFORE UPDATE ON public.pengumuman
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  BEGIN
    ALTER TABLE public.tugas ADD COLUMN IF NOT EXISTS sumber_ethol TEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.pengumuman ADD COLUMN IF NOT EXISTS isi TEXT;
    ALTER TABLE public.pengumuman ADD COLUMN IF NOT EXISTS sumber_url TEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.mata_kuliah ADD COLUMN IF NOT EXISTS dosen TEXT DEFAULT 'Dosen Pengampu';
    ALTER TABLE public.mata_kuliah ADD COLUMN IF NOT EXISTS hari TEXT DEFAULT 'Sesuai Jadwal';
    ALTER TABLE public.mata_kuliah ADD COLUMN IF NOT EXISTS jam TEXT DEFAULT 'Sesuai Jadwal';
    ALTER TABLE public.mata_kuliah ADD COLUMN IF NOT EXISTS ruang TEXT DEFAULT 'Kelas Virtual / Offline';
    ALTER TABLE public.mata_kuliah ADD COLUMN IF NOT EXISTS ethol_course_id TEXT UNIQUE;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

DO $$ 
BEGIN 
  PERFORM public.ensure_tables_exist(); 
END $$;


-- RPC Functions for Dashboard Wali ETHOL Sync

-- 1. Upsert Mata Kuliah Batch
CREATE OR REPLACE FUNCTION public.upsert_mata_kuliah_batch(data_mk jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.mata_kuliah (kode, nama, sks, prodi, jenis, ethol_course_id)
  SELECT 
    (elem->>'kode')::TEXT,
    (elem->>'nama')::TEXT,
    (elem->>'sks')::INT,
    COALESCE((elem->>'prodi')::TEXT, 'Teknik Informatika'),
    COALESCE((elem->>'jenis')::public.jenis_matkul, 'wajib'),
    (elem->>'ethol_course_id')::TEXT
  FROM jsonb_array_elements(data_mk) AS elem
  ON CONFLICT (ethol_course_id) 
  DO UPDATE SET
    nama = EXCLUDED.nama,
    sks = EXCLUDED.sks,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Upsert Nilai Mahasiswa Batch
CREATE OR REPLACE FUNCTION public.upsert_nilai_batch(data_nilai jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.nilai_mahasiswa (mahasiswa_id, semester_id, mata_kuliah_id, nilai_tugas, nilai_uts, nilai_uas)
  SELECT 
    (elem->>'mahasiswa_id')::UUID,
    (elem->>'semester_id')::UUID,
    (elem->>'mata_kuliah_id')::UUID,
    (elem->>'nilai_tugas')::NUMERIC,
    (elem->>'nilai_uts')::NUMERIC,
    (elem->>'nilai_uas')::NUMERIC
  FROM jsonb_array_elements(data_nilai) AS elem
  ON CONFLICT (mahasiswa_id, semester_id, mata_kuliah_id) 
  DO UPDATE SET
    nilai_tugas = EXCLUDED.nilai_tugas,
    nilai_uts = EXCLUDED.nilai_uts,
    nilai_uas = EXCLUDED.nilai_uas;
    -- grade & bobot_nilai and alert will be calculated by triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Upsert Kehadiran Batch
CREATE OR REPLACE FUNCTION public.upsert_kehadiran_batch(data_hadir jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.kehadiran (mahasiswa_id, semester_id, mata_kuliah_id, total_pertemuan, hadir, izin, sakit, alpha)
  SELECT 
    (elem->>'mahasiswa_id')::UUID,
    (elem->>'semester_id')::UUID,
    (elem->>'mata_kuliah_id')::UUID,
    (elem->>'total_pertemuan')::INT,
    (elem->>'hadir')::INT,
    (elem->>'izin')::INT,
    (elem->>'sakit')::INT,
    (elem->>'alpha')::INT
  FROM jsonb_array_elements(data_hadir) AS elem
  ON CONFLICT (mahasiswa_id, semester_id, mata_kuliah_id) 
  DO UPDATE SET
    total_pertemuan = EXCLUDED.total_pertemuan,
    hadir = EXCLUDED.hadir,
    izin = EXCLUDED.izin,
    sakit = EXCLUDED.sakit,
    alpha = EXCLUDED.alpha;
    -- alert will be calculated by triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get or Create Mahasiswa
CREATE OR REPLACE FUNCTION public.get_or_create_mahasiswa(
  p_user_id UUID,
  p_nrp TEXT,
  p_nama TEXT,
  p_kelas TEXT,
  p_prodi TEXT,
  p_angkatan INT,
  p_dosen_wali_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_mhs_id UUID;
BEGIN
  SELECT id INTO v_mhs_id FROM public.mahasiswa WHERE nrp = p_nrp;
  
  IF v_mhs_id IS NULL THEN
    INSERT INTO public.mahasiswa (user_id, dosen_wali_id, nrp, nama_lengkap, kelas, prodi, angkatan)
    VALUES (p_user_id, p_dosen_wali_id, p_nrp, p_nama, p_kelas, p_prodi, p_angkatan)
    RETURNING id INTO v_mhs_id;
  ELSE
    UPDATE public.mahasiswa 
    SET 
      nama_lengkap = p_nama,
      kelas = p_kelas,
      prodi = p_prodi,
      dosen_wali_id = p_dosen_wali_id
    WHERE id = v_mhs_id;
  END IF;
  
  RETURN v_mhs_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADDITIONAL TABLES for Complete Data Coverage
-- ============================================================================

-- 5. Ujian / Exam Schedule Cache
CREATE TABLE IF NOT EXISTS public.ujian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semester(id) ON DELETE SET NULL,
  nomor_ujian INT NOT NULL,
  matakuliah TEXT NOT NULL,
  keterangan TEXT,
  jenis TEXT DEFAULT 'UTS',
  tanggal TEXT,
  waktu TEXT,
  tgl_indonesia TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mahasiswa_id, nomor_ujian)
);

ALTER TABLE public.ujian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ujian: mahasiswa lihat sendiri" ON public.ujian;
CREATE POLICY "ujian: mahasiswa lihat sendiri"
  ON public.ujian FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP POLICY IF EXISTS "ujian: dosen wali lihat binaan" ON public.ujian;
CREATE POLICY "ujian: dosen wali lihat binaan"
  ON public.ujian FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.mahasiswa
    WHERE id = ujian.mahasiswa_id
      AND dosen_wali_id = public.get_current_dosen_wali_id()
  ));

DROP TRIGGER IF EXISTS trg_ujian_updated_at ON public.ujian;
CREATE TRIGGER trg_ujian_updated_at
  BEFORE UPDATE ON public.ujian
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Quiz Attempt Cache
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
  mata_kuliah_id UUID REFERENCES public.mata_kuliah(id) ON DELETE SET NULL,
  kuis_id INT NOT NULL,
  judul TEXT NOT NULL,
  skor NUMERIC(5,2),
  waktu_mulai TIMESTAMPTZ,
  waktu_selesai TIMESTAMPTZ,
  status TEXT DEFAULT 'belum',
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mahasiswa_id, kuis_id)
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz: mahasiswa lihat sendiri" ON public.quiz_attempts;
CREATE POLICY "quiz: mahasiswa lihat sendiri"
  ON public.quiz_attempts FOR SELECT
  USING (mahasiswa_id = public.get_current_mahasiswa_id());

DROP TRIGGER IF EXISTS trg_quiz_updated_at ON public.quiz_attempts;
CREATE TRIGGER trg_quiz_updated_at
  BEFORE UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. WebSocket Events Log for Real-time Sync Tracking
CREATE TABLE IF NOT EXISTS public.ws_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ws_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws_events: user lihat sendiri" ON public.ws_events;
CREATE POLICY "ws_events: user lihat sendiri"
  ON public.ws_events FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ws_events_user ON public.ws_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_events_type ON public.ws_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ws_events_time ON public.ws_events(received_at DESC);

-- 8. Add index for notifications performance
CREATE INDEX IF NOT EXISTS idx_notif_user_status ON public.notifikasi(user_id, status);

-- 9. Function to auto-create notification for new alerts
CREATE OR REPLACE FUNCTION public.notify_alert_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifikasi (user_id, mahasiswa_id, alert_id, judul, pesan, tipe)
  SELECT
    u.id,
    NEW.mahasiswa_id,
    NEW.id,
    'Alert Akademik Baru',
    CASE NEW.tipe_alert
      WHEN 'nilai_rendah' THEN 'Nilai akademik Anda perlu perhatian'
      WHEN 'kehadiran_buruk' THEN 'Kehadiran Anda di bawah threshold'
      WHEN 'ipk_turun' THEN 'IPK Anda mengalami penurunan'
      WHEN 'sks_tidak_cukup' THEN 'SKS yang diambil tidak mencukupi'
      ELSE 'Perhatian akademik diperlukan'
    END || '. Segera konsultasi dengan dosen wali.',
    'alert'
  FROM public.users u
  JOIN public.mahasiswa m ON m.user_id = u.id
  WHERE m.id = NEW.mahasiswa_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_alert ON public.alert_akademik;
CREATE TRIGGER trg_notify_alert
  AFTER INSERT ON public.alert_akademik
  FOR EACH ROW EXECUTE FUNCTION public.notify_alert_created();

-- 10. Add dosen_wali_id index on users for faster lookups
CREATE INDEX IF NOT EXISTS idx_mahasiswa_user_id ON public.mahasiswa(user_id);

-- 11. Ensure the notifikasi table has mahasiswa_id column for linking
DO $$ BEGIN
  ALTER TABLE public.notifikasi ADD COLUMN IF NOT EXISTS dosen_wali_id UUID REFERENCES public.dosen_wali(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 12. RPC: Sync exam schedule
CREATE OR REPLACE FUNCTION public.upsert_ujian_batch(data_ujian jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.ujian (mahasiswa_id, semester_id, nomor_ujian, matakuliah, keterangan, jenis, tanggal, waktu, tgl_indonesia, raw_data)
  SELECT
    (elem->>'mahasiswa_id')::UUID,
    (elem->>'semester_id')::UUID,
    (elem->>'nomor_ujian')::INT,
    (elem->>'matakuliah')::TEXT,
    (elem->>'keterangan')::TEXT,
    COALESCE((elem->>'jenis')::TEXT, 'UTS'),
    (elem->>'tanggal')::TEXT,
    (elem->>'waktu')::TEXT,
    (elem->>'tgl_indonesia')::TEXT,
    elem->'raw_data'
  FROM jsonb_array_elements(data_ujian) AS elem
  ON CONFLICT (mahasiswa_id, nomor_ujian)
  DO UPDATE SET
    matakuliah = EXCLUDED.matakuliah,
    keterangan = EXCLUDED.keterangan,
    jenis = EXCLUDED.jenis,
    tanggal = EXCLUDED.tanggal,
    waktu = EXCLUDED.waktu,
    tgl_indonesia = EXCLUDED.tgl_indonesia,
    raw_data = EXCLUDED.raw_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Ensure ensure_tables_exist includes new tables
CREATE OR REPLACE FUNCTION public.ensure_tables_exist_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_tables_exist();

  CREATE TABLE IF NOT EXISTS public.ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semester(id) ON DELETE SET NULL,
    nomor_ujian INT NOT NULL,
    matakuliah TEXT NOT NULL,
    keterangan TEXT, jenis TEXT DEFAULT 'UTS',
    tanggal TEXT, waktu TEXT, tgl_indonesia TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mahasiswa_id, nomor_ujian)
  );
  ALTER TABLE public.ujian ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(id) ON DELETE CASCADE,
    mata_kuliah_id UUID REFERENCES public.mata_kuliah(id) ON DELETE SET NULL,
    kuis_id INT NOT NULL, judul TEXT NOT NULL,
    skor NUMERIC(5,2), waktu_mulai TIMESTAMPTZ, waktu_selesai TIMESTAMPTZ,
    status TEXT DEFAULT 'belum', raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mahasiswa_id, kuis_id)
  );
  ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.ws_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, event_data JSONB,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE public.ws_events ENABLE ROW LEVEL SECURITY;

  -- Add missing columns
  BEGIN ALTER TABLE public.notifikasi ADD COLUMN IF NOT EXISTS dosen_wali_id UUID REFERENCES public.dosen_wali(id) ON DELETE SET NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE public.mahasiswa ADD COLUMN IF NOT EXISTS tempat_lahir TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.mahasiswa ADD COLUMN IF NOT EXISTS tanggal_lahir DATE; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.mahasiswa ADD COLUMN IF NOT EXISTS alamat TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.mahasiswa ADD COLUMN IF NOT EXISTS no_hp TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;
