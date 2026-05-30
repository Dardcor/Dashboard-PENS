import * as cheerio from 'cheerio';

export interface MisBiodata {
  nrp?: string;
  nama_lengkap?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  agama?: string;
  alamat?: string;
  no_hp?: string;
  email?: string;
  prodi?: string;
  jurusan?: string;
  kelas?: string;
  angkatan?: number;
  status_akademik?: string;
  dosen_wali?: string;
  nip_dosen_wali?: string;
}

export interface MisNilaiMatkul {
  kode: string;
  nama: string;
  sks: number;
  nilai_angka?: number;
  nilai_huruf: string;
  bobot?: number;
}

export interface MisKhs {
  semester?: string;
  tahun_akademik?: string;
  ips?: number;
  ipk?: number;
  sks_semester?: number;
  sks_kumulatif?: number;
  mata_kuliah: MisNilaiMatkul[];
}

export interface MisKehadiranMatkul {
  kode: string;
  nama: string;
  total_pertemuan: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  persentase: number;
}

export interface MisJadwalKuliah {
  kode: string;
  nama: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  ruang: string;
  dosen: string;
  kelas: string;
}

export interface MisPengumuman {
  judul: string;
  tanggal: string;
  isi: string;
  sumber_url: string;
}

export interface MisTranskrip {
  semester: string;
  ips: number;
  sks_semester: number;
  ipk: number;
  sks_kumulatif: number;
  mata_kuliah: MisNilaiMatkul[];
}

export function parseBiodata(html: string): MisBiodata {
  const $ = cheerio.load(html);
  const data: MisBiodata = {};

  $('table').each((_, table) => {
    $(table).find('tr').each((__, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return;
      const label = $(tds[0]).text().trim().toLowerCase().replace(/[:\s]/g, '');
      const value = $(tds[2]).text().trim();

      const map: Record<string, (v: string) => void> = {
        'nrp': (v) => { data.nrp = v; },
        'nim': (v) => { data.nrp = v; },
        'namamahasiswa': (v) => { data.nama_lengkap = v; },
        'nama': (v) => { data.nama_lengkap = v; },
        'tempatlhr': (v) => { data.tempat_lahir = v; },
        'tanggallhr': (v) => { data.tanggal_lahir = v; },
        'jeniskelamin': (v) => { data.jenis_kelamin = v; },
        'agama': (v) => { data.agama = v; },
        'alamat': (v) => { data.alamat = v; },
        'nohp': (v) => { data.no_hp = v; },
        'telepon': (v) => { data.no_hp = v; },
        'email': (v) => { data.email = v; },
        'programstudi': (v) => { data.prodi = v; },
        'prodi': (v) => { data.prodi = v; },
        'jurusan': (v) => { data.jurusan = v; },
        'kelas': (v) => { data.kelas = v; },
        'angkatan': (v) => { data.angkatan = parseInt(v) || undefined; },
        'tahunmasuk': (v) => { data.angkatan = parseInt(v) || undefined; },
        'status': (v) => { data.status_akademik = v; },
        'statusakademik': (v) => { data.status_akademik = v; },
        'dosenwali': (v) => { data.dosen_wali = v; },
        'nipdosenwali': (v) => { data.nip_dosen_wali = v; },
      };

      if (map[label]) map[label](value);
    });
  });

  return data;
}

export function parseKhs(html: string): MisKhs {
  const $ = cheerio.load(html);
  const result: MisKhs = { mata_kuliah: [] };

  const bodyText = $('body').text();

  const ipsMatch = bodyText.match(/IPS\s*:\s*([0-9.,]+)/i);
  if (ipsMatch) result.ips = parseFloat(ipsMatch[1].replace(',', '.'));

  const ipkMatch = bodyText.match(/IPK\s*:\s*([0-9.,]+)/i);
  if (ipkMatch) result.ipk = parseFloat(ipkMatch[1].replace(',', '.'));

  const sksSemMatch = bodyText.match(/SKS\s*Semester\s*:\s*(\d+)/i);
  if (sksSemMatch) result.sks_semester = parseInt(sksSemMatch[1]);

  const sksKumMatch = bodyText.match(/SKS\s*Kumulatif\s*:\s*(\d+)/i);
  if (sksKumMatch) result.sks_kumulatif = parseInt(sksKumMatch[1]);

  const semesterMatch = bodyText.match(/Semester\s*:\s*([^\n]+)/i);
  if (semesterMatch) result.semester = semesterMatch[1].trim();

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').first().text().toLowerCase();
    if (!headerText.includes('nilai') && !headerText.includes('grade') && !headerText.includes('sks')) return;

    $(table).find('tr').each((i, tr) => {
      if (i === 0) return;
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      let idx = 0;
      const kode = $(tds[idx++]).text().trim();
      const nama = $(tds[idx++]).text().trim();
      const sksStr = $(tds[idx++]).text().trim();
      const nilaiHuruf = $(tds[idx++]).text().trim();
      const bobotStr = tds.length > idx ? $(tds[idx]).text().trim() : '';

      const sks = parseInt(sksStr) || 0;
      if (!kode || !nama) return;

      const gradeWeights: Record<string, number> = {
        'A': 4.0, 'AB': 3.5, 'B': 3.0, 'BC': 2.5,
        'C': 2.0, 'D': 1.0, 'E': 0.0
      };

      result.mata_kuliah.push({
        kode,
        nama,
        sks,
        nilai_huruf: nilaiHuruf,
        bobot: parseFloat(bobotStr.replace(',', '.')) || gradeWeights[nilaiHuruf.toUpperCase()] || 0,
      });
    });
  });

  return result;
}

export function parseKehadiran(html: string): MisKehadiranMatkul[] {
  const $ = cheerio.load(html);
  const result: MisKehadiranMatkul[] = [];

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').first().text().toLowerCase();
    if (!headerText.includes('hadir') && !headerText.includes('absen') && !headerText.includes('pertemuan')) return;

    const headers: string[] = [];
    $(table).find('tr').first().find('th, td').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    $(table).find('tr').each((i, tr) => {
      if (i === 0) return;
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const getCol = (keyword: string): string => {
        const idx = headers.findIndex(h => h.includes(keyword));
        return idx >= 0 ? $(tds[idx]).text().trim() : '';
      };

      const kode = getCol('kode') || $(tds[0]).text().trim();
      const nama = getCol('matakuliah') || getCol('nama') || $(tds[1]).text().trim();
      const hadirStr = getCol('hadir');
      const izinStr = getCol('izin');
      const sakitStr = getCol('sakit');
      const alphaStr = getCol('alpha') || getCol('alpa');
      const totalStr = getCol('total') || getCol('pertemuan');

      if (!nama) return;

      const hadir = parseInt(hadirStr) || 0;
      const izin = parseInt(izinStr) || 0;
      const sakit = parseInt(sakitStr) || 0;
      const alpha = parseInt(alphaStr) || 0;
      const total = parseInt(totalStr) || (hadir + izin + sakit + alpha) || 1;

      result.push({
        kode, nama,
        total_pertemuan: total,
        hadir, izin, sakit, alpha,
        persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
      });
    });
  });

  return result;
}

export function parseJadwal(html: string): MisJadwalKuliah[] {
  const $ = cheerio.load(html);
  const result: MisJadwalKuliah[] = [];

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').first().text().toLowerCase();
    if (!headerText.includes('hari') && !headerText.includes('jam') && !headerText.includes('ruang')) return;

    const headers: string[] = [];
    $(table).find('tr').first().find('th, td').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    $(table).find('tr').each((i, tr) => {
      if (i === 0) return;
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const getCol = (keyword: string): string => {
        const idx = headers.findIndex(h => h.includes(keyword));
        return idx >= 0 ? $(tds[idx]).text().trim() : '';
      };

      const kode = getCol('kode') || $(tds[0]).text().trim();
      const nama = getCol('matakuliah') || getCol('nama') || '';
      const hari = getCol('hari') || '';
      const jamMulai = getCol('mulai') || getCol('jam_mulai') || '';
      const jamSelesai = getCol('selesai') || getCol('jam_selesai') || '';
      const ruang = getCol('ruang') || '';
      const dosen = getCol('dosen') || getCol('pengampu') || '';
      const kelas = getCol('kelas') || '';

      if (!nama) return;
      result.push({ kode, nama, hari, jam_mulai: jamMulai, jam_selesai: jamSelesai, ruang, dosen, kelas });
    });
  });

  return result;
}

export function parsePengumuman(html: string): MisPengumuman[] {
  const $ = cheerio.load(html);
  const result: MisPengumuman[] = [];

  $('.pengumuman-item, .announcement, .berita-item, article, .card, .list-group-item').each((_, el) => {
    const judul = $(el).find('h3, h4, h5, .judul, .title, .card-title').first().text().trim();
    const tanggal = $(el).find('.date, .tanggal, time, small').first().text().trim();
    const isi = $(el).find('.isi, .content, .card-text, p').first().text().trim();

    if (judul && isi) {
      result.push({ judul, tanggal, isi, sumber_url: '' });
    }
  });

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').first().text().toLowerCase();
    if (!headerText.includes('pengumuman') && !headerText.includes('judul')) return;

    $(table).find('tr').each((i, tr) => {
      if (i === 0) return;
      const tds = $(tr).find('td');
      if (tds.length < 2) return;
      const judul = $(tds[0]).text().trim();
      const tanggal = tds.length > 1 ? $(tds[1]).text().trim() : '';
      if (judul) result.push({ judul, tanggal, isi: '', sumber_url: '' });
    });
  });

  return result;
}

export function parseTranskrip(html: string): { semesters: MisTranskrip[] } {
  const $ = cheerio.load(html);
  const result: MisTranskrip[] = [];
  let currentSemester: MisTranskrip | null = null;

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').first().text().toLowerCase();

    if (headerText.includes('semester') && headerText.includes('sks') && headerText.includes('ipk')) {
      $(table).find('tr').each((i, tr) => {
        if (i === 0) return;
        const tds = $(tr).find('td');
        if (tds.length < 2) return;

        const semesterLabel = $(tds[0]).text().trim();
        const ipsStr = tds.length > 1 ? $(tds[1]).text().trim() : '0';
        const sksSemStr = tds.length > 2 ? $(tds[2]).text().trim() : '0';
        const ipkStr = tds.length > 3 ? $(tds[3]).text().trim() : '0';
        const sksKumStr = tds.length > 4 ? $(tds[4]).text().trim() : '0';

        if (semesterLabel && !semesterLabel.toLowerCase().includes('semester')) return;

        currentSemester = {
          semester: semesterLabel,
          ips: parseFloat(ipsStr.replace(',', '.')) || 0,
          sks_semester: parseInt(sksSemStr) || 0,
          ipk: parseFloat(ipkStr.replace(',', '.')) || 0,
          sks_kumulatif: parseInt(sksKumStr) || 0,
          mata_kuliah: [],
        };
        result.push(currentSemester);
      });
    }

    if (currentSemester && (headerText.includes('kode') || headerText.includes('matakuliah') || headerText.includes('sks'))) {
      $(table).find('tr').each((i, tr) => {
        if (i === 0) return;
        const tds = $(tr).find('td');
        if (tds.length < 4) return;

        const kode = $(tds[0]).text().trim();
        const nama = $(tds[1]).text().trim();
        const sksStr = $(tds[2]).text().trim();
        const nilaiStr = $(tds[3]).text().trim();
        const sks = parseInt(sksStr) || 0;

        const gradeWeights: Record<string, number> = {
          'A': 4.0, 'AB': 3.5, 'B': 3.0, 'BC': 2.5,
          'C': 2.0, 'D': 1.0, 'E': 0.0
        };

        if (kode && nama) {
          currentSemester!.mata_kuliah.push({
            kode, nama, sks, nilai_huruf: nilaiStr,
            bobot: gradeWeights[nilaiStr.toUpperCase()] || 0,
          });
        }
      });
    }
  });

  return { semesters: result };
}
