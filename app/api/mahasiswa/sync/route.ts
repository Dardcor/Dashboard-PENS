import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as etholApi from '../../../../lib/ethol-api';

const ETHOL_BASE = 'https://ethol.pens.ac.id';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => delay(Math.floor(Math.random() * (b - a + 1)) + a);

function parseCookies(raw: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of raw) {
    const p = h.split(';')[0].trim();
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  }
  return out;
}

// ─── Scraping: Profile ─────────────────────────────────────────────────────────
async function scrapeProfile(cookieStr: string) {
  const urls = [
    `${ETHOL_BASE}/my/`,
    `${ETHOL_BASE}/user/profile.php`,
    `${ETHOL_BASE}/mahasiswa/beranda`,
  ];
  for (const url of urls) {
    try {
      await rnd(300, 600);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length) continue;

      const fullName =
        $('h1.page-header-headings span').first().text().trim() ||
        $('h1[class*="title"]').first().text().trim() ||
        $('h1.fullname').first().text().trim() ||
        $('.usertext, .username, .user-name, .fullname, [class*="user"]').first().text().trim() ||
        $('span.userbutton .usertext').first().text().trim() ||
        null;

      const bodyText = $('body').text().replace(/\s+/g, ' ');
      const nrp = bodyText.match(/\b(\d{10})\b/)?.[1] ?? null;
      const prodi = bodyText.match(/D[34]\s+Teknik\s+\w+(?:\s+\w+)?/i)?.[0]?.trim() ?? null;
      const kelas = bodyText.match(/\b([1-4]\s*[A-Z]{2}\s*[A-Z])\b/)?.[1]?.trim() ?? null;
      const angkatan = parseInt(bodyText.match(/\b(20\d{2})\b/)?.[1] ?? '') || new Date().getFullYear();

      if (fullName || nrp) return { fullName, nrp, prodi, kelas, angkatan };
    } catch (e) { console.log(`[SYNC-SCRAPE] Profile ${url}: ${(e as Error).message}`); }
  }
  return { fullName: null, nrp: null, prodi: null, kelas: null, angkatan: new Date().getFullYear() };
}

// ─── Scraping: Nilai ───────────────────────────────────────────────────────────
async function scrapeNilai(cookieStr: string) {
  const list: { courseName: string; grade: string; nilaiAngka?: number }[] = [];
  const urls = [
    `${ETHOL_BASE}/grade/report/overview/index.php`,
    `${ETHOL_BASE}/grade/report/user/index.php`,
    `${ETHOL_BASE}/mahasiswa/nilai`,
  ];
  for (const url of urls) {
    try {
      await rnd(300, 600);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length) continue;
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const name = $(cells[0]).text().trim();
        const raw = $(cells[cells.length - 1]).text().trim();
        if (!name || /course name|nama|mata.?kuliah/i.test(name)) return;
        const n = raw.match(/[\d.]+/);
        list.push({ courseName: name, grade: raw.substring(0, 5), nilaiAngka: n ? parseFloat(n[0]) : undefined });
      });
      if (list.length) break;
    } catch (e) { console.log(`[SYNC-SCRAPE] Nilai: ${(e as Error).message}`); }
  }
  return list;
}

// ─── Scraping: Kehadiran ───────────────────────────────────────────────────────
async function scrapeKehadiran(cookieStr: string) {
  const list: { matkul: string; hadir: number; total: number; persentase: number }[] = [];
  const urls = [
    `${ETHOL_BASE}/mod/attendance/view.php`,
    `${ETHOL_BASE}/mahasiswa/kehadiran`,
  ];
  for (const url of urls) {
    try {
      await rnd(300, 600);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length) continue;
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const matkul = $(cells[0]).text().trim();
        const pct = parseFloat($(cells[cells.length - 1]).text().replace('%', '').trim());
        if (!matkul || isNaN(pct) || /mata.?kuliah|course/i.test(matkul)) return;
        const m = $(cells[1]).text().match(/(\d+)\/(\d+)/);
        list.push({ matkul, hadir: m ? parseInt(m[1]) : Math.round(16 * pct / 100), total: m ? parseInt(m[2]) : 16, persentase: pct });
      });
      if (list.length) break;
    } catch (e) { console.log(`[SYNC-SCRAPE] Kehadiran: ${(e as Error).message}`); }
  }
  return list;
}

async function scrapeTugas(cookieStr: string, jwt: string | null, tahun: number, semester: number) {
  const list: {
    judul: string;
    matkul: string;
    deadline: string | null;
    status: string;
    sumber_url: string;
  }[] = [];

  if (jwt) {
    try {
      console.log(`[SYNC-API] Tugas querying with params ${tahun}-${semester}...`);
      const data = await etholApi.getLatestAssignments(jwt, tahun, semester);
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((t: any) => {
          list.push({
            judul: (t.title || t.judul || t.judul_tugas || 'Tugas').substring(0, 255),
            matkul: (t.matakuliah || t.nama_matakuliah || 'Dari API').substring(0, 100),
            deadline: (t.deadline || t.tgl_deadline || null)?.substring(0, 100),
            status: 'Belum mengumpulkan',
            sumber_url: `${ETHOL_BASE}/tugas`,
          });
        });
        console.log(`[SYNC-API] Tugas found: ${list.length}`);
        if (list.length > 0) return list;
      }
    } catch (e: any) {
      console.log(`[SYNC-API] Tugas Error: ${e.message}`);
    }
  }

  const urls = [
    `${ETHOL_BASE}/calendar/view.php?view=upcoming`,
    `${ETHOL_BASE}/my/`,
    `${ETHOL_BASE}/mahasiswa/beranda`,
  ];

  for (const url of urls) {
    try {
      await rnd(300, 600);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length) continue;

      // Strategy 1: Upcoming events / timeline (calendar page)
      $('[data-type="assign"], .event[href*="assign"], .timeline-event-list-item').each((_, el) => {
        const judul = $(el).find('.description, .event-name, a').first().text().trim();
        const deadlineRaw = $(el).find('.date, time, .description').text().trim();
        const matkulEl = $(el).find('.course, .mod-name, .small');
        const matkul = matkulEl.text().trim() || 'Umum';
        const href = $(el).find('a').attr('href') || url;
        if (judul && judul.length > 3) {
          list.push({
            judul: judul.substring(0, 255),
            matkul: matkul.substring(0, 100),
            deadline: deadlineRaw ? deadlineRaw.substring(0, 100) : null,
            status: 'Belum mengumpulkan',
            sumber_url: href.startsWith('http') ? href : `${ETHOL_BASE}${href}`,
          });
        }
      });

      // Strategy 2: Dashboard upcoming assignments block
      if (list.length === 0) {
        $('.block_myoverview .event-list-item, .block-myoverview-item, .aalink[href*="assign"]').each((_, el) => {
          const judul = $(el).text().trim();
          const href = $(el).attr('href') || url;
          if (judul && judul.length > 3) {
            list.push({
              judul: judul.substring(0, 255),
              matkul: 'Dari Dasbor',
              deadline: null,
              status: 'Belum mengumpulkan',
              sumber_url: href.startsWith('http') ? href : `${ETHOL_BASE}${href}`,
            });
          }
        });
      }

      if (list.length) break;
    } catch (e) {
      console.log(`[SYNC-SCRAPE] Tugas ${url}: ${(e as Error).message}`);
    }
  }
  return list;
}

// ─── Scraping: Pengumuman ──────────────────────────────────────────────────────
async function scrapePengumuman(cookieStr: string, jwt: string | null) {
  const list: {
    judul: string;
    publisher: string;
    tanggal: string;
    isi: string;
    file_url: string | null;
    file_name: string | null;
    sumber_url: string;
  }[] = [];

  if (jwt) {
    try {
      const data = await etholApi.getLatestAnnouncements(jwt);
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((p: any) => {
          list.push({
            judul: (p.judul || 'Pengumuman').substring(0, 255),
            publisher: (p.namaPegawai || p.nama_pegawai || 'PENS').substring(0, 100),
            tanggal: (p.waktu_indo || p.tgl_indo || new Date().toISOString()).substring(0, 50),
            isi: (p.isiPengumuman || p.pengumuman || p.isi_pengumuman || '').substring(0, 500),
            file_url: p.file_url ? (p.file_url.startsWith('http') ? p.file_url : `${ETHOL_BASE}${p.file_url}`) : null,
            file_name: null,
            sumber_url: `${ETHOL_BASE}/pengumuman`,
          });
        });
        console.log(`[SYNC-API] Pengumuman found: ${list.length}`);
        if (list.length > 0) return list;
      }
    } catch (e: any) {
      console.log(`[SYNC-API] Pengumuman Error: ${e.message}`);
    }
  }

  const urls = [
    `${ETHOL_BASE}/mahasiswa/beranda`,
    `${ETHOL_BASE}/my/`,
    `${ETHOL_BASE}/news/index.php`,
  ];

  for (const url of urls) {
    try {
      await rnd(300, 600);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length) continue;

      // Strategy 1: Forum-style announcements (Moodle news forum)
      $('.forumpost, .post-body, [data-region="article"]').each((_, el) => {
        const judul = $(el).find('.subject, h3, h4, .post-subject').first().text().trim();
        const publisher = $(el).find('.author, .user-info-picture, .username').first().text().trim() || 'BAAK PENS';
        const tanggal = $(el).find('.date, time, .posting').first().text().trim() || new Date().toISOString().split('T')[0];
        const isi = $(el).find('.content, .posting, p').first().text().trim().substring(0, 500);
        const fileHref = $(el).find('a[href*="file"], a[href*="download"]').attr('href');
        const fileName = fileHref ? fileHref.split('/').pop() || null : null;
        if (judul && judul.length > 3) {
          list.push({
            judul: judul.substring(0, 255),
            publisher: publisher.substring(0, 100),
            tanggal: tanggal.substring(0, 50),
            isi: isi,
            file_url: fileHref ? (fileHref.startsWith('http') ? fileHref : `${ETHOL_BASE}${fileHref}`) : null,
            file_name: fileName,
            sumber_url: url,
          });
        }
      });

      // Strategy 2: News/notification blocks on dashboard
      if (list.length === 0) {
        $('.block_news_items li, .news-items-text, .message-body').each((_, el) => {
          const judul = $(el).find('a, strong').first().text().trim();
          const isi = $(el).text().trim().substring(0, 500);
          if (judul && judul.length > 3) {
            list.push({
              judul: judul.substring(0, 255),
              publisher: 'PENS',
              tanggal: new Date().toISOString().split('T')[0],
              isi: isi,
              file_url: null,
              file_name: null,
              sumber_url: url,
            });
          }
        });
      }

      if (list.length) break;
    } catch (e) {
      console.log(`[SYNC-SCRAPE] Pengumuman ${url}: ${(e as Error).message}`);
    }
  }
  return list;
}

// ─── Scraping: Materi & Jadwal Kuliah ─────────────────────────────────────────
async function scrapeMateri(cookieStr: string, jwt: string | null, tahun: number, semester: number) {
  const list: { judul: string; deskripsi: string; matkul: string; file_url: string | null }[] = [];
  if (jwt) {
    try {
      const res = await axios.get(`${ETHOL_BASE}/api/mahasiswa/materi`, {
        headers: { 'token': jwt, 'Cookie': cookieStr }, validateStatus: (s) => s < 500, timeout: 10000
      });
      const data = res.data;
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((m: any) => {
          list.push({
            judul: (m.judul || m.title || 'Materi Pembelajaran').substring(0, 255),
            deskripsi: (m.deskripsi || m.description || '').substring(0, 1000),
            matkul: (m.matakuliah || m.nama_matakuliah || 'Umum').substring(0, 100),
            file_url: m.file_url ? (m.file_url.startsWith('http') ? m.file_url : `${ETHOL_BASE}${m.file_url}`) : null,
          });
        });
        if (list.length > 0) return list;
      }
    } catch (e: any) { console.log(`[SYNC-API] Materi Error: ${e.message}`); }
  }
  return list;
}

async function scrapeJadwalKuliah(cookieStr: string, jwt: string | null) {
  const list: { matkul: string; hari: string; jam: string; ruang: string; dosen: string }[] = [];
  if (jwt) {
    try {
      const res = await axios.get(`${ETHOL_BASE}/api/mahasiswa/jadwal`, {
        headers: { 'token': jwt, 'Cookie': cookieStr }, validateStatus: (s) => s < 500, timeout: 10000
      });
      if (res.status === 200 && Array.isArray(res.data)) {
        res.data.forEach((j: any) => {
          list.push({
            matkul: (j.matakuliah || j.nama_matakuliah || 'Jadwal').substring(0, 100),
            hari: (j.hari || 'Sesuai Jadwal').substring(0, 20),
            jam: (j.jam || `${j.jam_mulai || ''} - ${j.jam_selesai || ''}`).substring(0, 50),
            ruang: (j.ruang || j.tempat || 'Kelas Offline').substring(0, 50),
            dosen: (j.dosen || 'Dosen Pengampu').substring(0, 100)
          });
        });
        if (list.length > 0) return list;
      }
    } catch (e: any) { console.log(`[SYNC-API] Jadwal Error: ${e.message}`); }
  }
  return list;
}

async function scrapeMatakuliahDetail(cookieStr: string, jwt: string | null, tahun: number, semester: number) {
  const list: { nama: string; dosen: string; hari: string; jam: string; ruang: string; kode: string }[] = [];
  
  // ── Layer 1: Use ETHOL REST API with JWT token ──
  if (jwt) {
    try {
      console.log(`[SYNC-API] Layer 1 (JWT) querying courses for ${tahun}-${semester}...`);
      let data = await etholApi.getCourses(jwt, tahun, semester);
      
      // Cascading Fallback if current active semester is empty or returns no courses
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[SYNC-API] No courses in ${tahun}-${semester}, trying fallbacks...`);
        const fallbacks = [
          { t: 2025, s: 2 },
          { t: 2025, s: 1 },
          { t: 2024, s: 2 },
          { t: 2024, s: 1 }
        ];
        for (const fb of fallbacks) {
          if (fb.t === tahun && fb.s === semester) continue;
          try {
            console.log(`[SYNC-API] Querying courses for fallback ${fb.t}-${fb.s}...`);
            const fbData = await etholApi.getCourses(jwt, fb.t, fb.s);
            if (Array.isArray(fbData) && fbData.length > 0) {
              data = fbData;
              console.log(`[SYNC-API] Fallback succeeded: found ${data.length} courses in ${fb.t}-${fb.s}`);
              break;
            }
          } catch (e: any) {
            console.log(`[SYNC-API] Fallback error for ${fb.t}-${fb.s}: ${e.message}`);
          }
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((c: any) => {
          let nameVal = '';
          if (c.matakuliah) {
            nameVal = typeof c.matakuliah === 'object' ? (c.matakuliah.nama || c.matakuliah.name || '') : c.matakuliah;
          } else {
            nameVal = c.nama || c.name || '';
          }
          if (!nameVal) return;

          list.push({
            nama: nameVal,
            dosen: c.dosen || c.dosen_pengampu || 'Dosen Pengampu',
            hari: c.hari || 'Sesuai Jadwal',
            jam: c.jam_mulai ? `${c.jam_mulai}${c.jam_selesai ? ` - ${c.jam_selesai}` : ''}` : 'Sesuai Jadwal',
            ruang: c.ruang || c.tempat || 'Kelas Virtual / Offline',
            kode: c.kode || c.kode_matakuliah || '',
          });
        });
        console.log(`[SYNC-API] Layer 1 (JWT) Success: ${list.length} courses found`);
        if (list.length > 0) return list;
      }
    } catch (e: any) {
      console.log(`[SYNC-API] Layer 1 JWT Error: ${e.message}`);
    }
  }

  // ── Layer 2: Direct ETHOL API call with cookie (and JWT token in header if present) ──
  // ETHOL is a Vue.js SPA — HTML scraping returns landing page shell.
  // The real data is served by the REST API at /api/kuliah
  const apiEndpoints = [
    { url: `${ETHOL_BASE}/api/kuliah?tahun=${tahun}&semester=${semester}`, method: 'GET' },
    { url: `${ETHOL_BASE}/api/kuliah?tahun=2025&semester=2`, method: 'GET' },
    { url: `${ETHOL_BASE}/api/kuliah?tahun=2025&semester=1`, method: 'GET' },
    { url: `${ETHOL_BASE}/api/kuliah?tahun=2024&semester=2`, method: 'GET' },
    { url: `${ETHOL_BASE}/api/jadwal/jadwal-online`, method: 'GET' },
  ];

  for (const ep of apiEndpoints) {
    try {
      await rnd(200, 400);
      const res = await axios.get(ep.url, {
        headers: {
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Accept': 'application/json, text/plain, */*',
          'Referer': `${ETHOL_BASE}/mahasiswa/matakuliah`,
          'X-Requested-With': 'XMLHttpRequest',
          ...(jwt ? { 'token': jwt } : {}),
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });

      if (res.status === 200 && res.data) {
        let courses = res.data;
        // Handle nested response: { data: [...] } or { courses: [...] }
        if (!Array.isArray(courses)) {
          courses = courses.data || courses.courses || courses.kuliah || courses.matakuliah || [];
        }
        
        if (Array.isArray(courses) && courses.length > 0) {
          courses.forEach((c: any) => {
            let nameVal = '';
            if (c.matakuliah) {
              nameVal = typeof c.matakuliah === 'object' ? (c.matakuliah.nama || c.matakuliah.name || '') : c.matakuliah;
            } else {
              nameVal = c.nama || c.name || c.mata_kuliah || c.course_name || '';
            }
            if (!nameVal || list.find(x => x.nama === nameVal)) return;

            list.push({
              nama: nameVal,
              dosen: c.dosen || c.dosen_pengampu || c.nama_dosen || c.lecturer || 'Dosen Pengampu',
              hari: c.hari || 'Sesuai Jadwal',
              jam: c.jam_mulai ? `${c.jam_mulai}${c.jam_selesai ? ` - ${c.jam_selesai}` : ''}` : (c.jam || c.waktu || 'Sesuai Jadwal'),
              ruang: c.ruang || c.tempat || c.room || 'Sesuai ETHOL',
              kode: c.kode || c.kode_matakuliah || c.kode_mk || '',
            });
          });
          console.log(`[SYNC-API] Layer 2 (Cookie API ${ep.url}): ${list.length} courses`);
          if (list.length > 0) return list;
        } else {
          console.log(`[SYNC-API] Layer 2 (${ep.url}): response not array, type=${typeof res.data}, keys=${Object.keys(res.data || {}).join(',')}`);
        }
      } else {
        console.log(`[SYNC-API] Layer 2 (${ep.url}): status=${res.status}`);
      }
    } catch (e: any) {
      console.log(`[SYNC-API] Layer 2 Error (${ep.url}): ${e.message}`);
    }
  }

  // ── Layer 3: Moodle enrolled courses via /my/ (Moodle is server-rendered) ──
  try {
    await rnd(300, 600);
    const res = await axios.get(`${ETHOL_BASE}/my/`, {
      headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
      timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
    });
    if (res.status === 200) {
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length === 0) {
        // Moodle dashboard: look for enrolled courses
        $('.course-listitem, .coursebox, [data-region="course-content"], .courses .card, .block_myoverview .card').each((_, el) => {
          const nama = $(el).find('.coursename, .course-title, h4, h3, .card-title, .multiline a').first().text().trim();
          const dosen = $(el).find('.teacher, .course-teacher, .teachers, .text-muted').first().text().trim() || 'Dosen Pengampu';
          if (nama && nama.length > 3 && nama.length < 100 && !list.find(x => x.nama === nama)) {
            list.push({ nama, dosen, hari: 'Sesuai Jadwal', jam: 'Sesuai Jadwal', ruang: 'Sesuai ETHOL', kode: '' });
          }
        });
        
        // Also try finding courses in course overview block
        if (list.length === 0) {
          $('a[href*="/course/view.php"]').each((_, el) => {
            const nama = $(el).text().trim();
            if (nama && nama.length > 5 && nama.length < 100 && !list.find(x => x.nama === nama)) {
              list.push({ nama, dosen: 'Dosen Pengampu', hari: 'Sesuai Jadwal', jam: 'Sesuai Jadwal', ruang: 'Sesuai ETHOL', kode: '' });
            }
          });
        }
        
        console.log(`[SYNC-SCRAPE] Layer 3 (Moodle /my/): ${list.length} courses`);
        if (list.length > 0) return list;
      }
    }
  } catch (e) {
    console.log(`[SYNC-SCRAPE] Layer 3 Error: ${(e as Error).message}`);
  }

  // ── Layer 4: Moodle AJAX enrolled courses ──
  try {
    const sesskey = await etholApi.getSesskey(cookieStr);
    if (sesskey) {
      const enrolledData = await etholApi.callMoodleAjax(cookieStr, sesskey, 'core_enrol_get_users_courses', { userid: 0 });
      if (Array.isArray(enrolledData) && enrolledData.length > 0) {
        enrolledData.forEach((c: any) => {
          const nama = c.fullname || c.shortname || '';
          if (nama && nama.length > 3 && !list.find(x => x.nama === nama)) {
            list.push({ nama, dosen: 'Dosen Pengampu', hari: 'Sesuai Jadwal', jam: 'Sesuai Jadwal', ruang: 'Sesuai ETHOL', kode: c.shortname || '' });
          }
        });
        console.log(`[SYNC-SCRAPE] Layer 4 (Moodle AJAX): ${list.length} courses`);
      }
    } else {
      console.log('[SYNC-SCRAPE] Layer 4: No sesskey available');
    }
  } catch (e) {
    console.log(`[SYNC-SCRAPE] Layer 4 Error: ${(e as Error).message}`);
  }

  // ── Layer 5: HTML Scraping of /mahasiswa/matakuliah ──
  try {
    if (list.length === 0) { // Only fallback to this if API/Moodle failed
      await rnd(300, 600);
      const res = await axios.get(`${ETHOL_BASE}/mahasiswa/matakuliah`, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });

      if (res.status === 200) {
        const $ = cheerio.load(res.data as string);
        if ($('input[name="username"]').length === 0) {
          const seenNames = new Set<string>(list.map(x => x.nama));
          
          $('a[href*="?id="], a[href*="course/view.php"], a[href*="/course/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const idMatch = href.match(/[?&]id=(\d+)/);
            if (!idMatch) return;
            
            let card = $(el).closest('.card, .coursebox, [class*="course"], [class*="card"], li, .col, .item, div[class]');
            if (card.length === 0) card = $(el).parentsUntil('body').filter((_, p) => {
              const tag = (p as any).tagName?.toLowerCase?.() || '';
              return tag === 'li' || tag === 'div' || tag === 'article';
            }).first();
            if (card.length === 0) card = $(el).parent();

            const cardText = card.text().replace(/\s+/g, ' ').trim();
            const linkText = $(el).text().trim();

            let nama = linkText || card.find('h3, h4, .card-title, .title').first().text().trim() || '';
            if (nama.length < 3) nama = card.find('[class*="title"], [class*="name"], strong').first().text().trim() || '';
            if (nama.toLowerCase().includes('akses') || nama.toLowerCase().includes('kuliah')) nama = '';

            if (!nama) {
              const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 100);
              for (const l of lines) {
                if (l.toLowerCase().includes('akses') || l.toLowerCase().includes('masuk')) continue;
                if (!nama && l.length > 3) { nama = l; break; }
              }
            }

            if (!nama || seenNames.has(nama)) return;
            seenNames.add(nama);

            let dosen = 'Dosen Pengampu';
            let hari = 'Sesuai Jadwal';
            let jam = 'Sesuai Jadwal';
            let ruang = 'Kelas Virtual / Offline';
            let kode = '';

            const codeMatch = cardText.match(/\b([A-Z]{2,4}\d{3,5})\b/);
            if (codeMatch) kode = codeMatch[1];

            const jadwalMatch = cardText.match(/(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]+(\d{2}:\d{2})(?:\s*(?:s\/d|-|sampai)\s*(\d{2}:\d{2}))?/i);
            if (jadwalMatch) {
              hari = jadwalMatch[1];
              jam = jadwalMatch[2] + (jadwalMatch[3] ? ` - ${jadwalMatch[3]}` : '');
            }

            const dosenText = card.find('[class*="dosen"], [class*="instructor"], [class*="teacher"]').first().text().trim();
            if (dosenText) dosen = dosenText.replace(/dosen\s*pengampu\s*[:\s]*/i, '').trim();

            const ruangMatch = cardText.match(/(?:Ruang|R\.|Lab\.|Lab|Kelas)\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i);
            if (ruangMatch) ruang = ruangMatch[0];

            list.push({ nama, dosen, hari, jam, ruang, kode });
          });
          
          $('.card, .coursebox, [class*="course-card"], [class*="card-course"], li.course-item, .col-md-4, .col-md-6, .col-lg-4').each((_, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (!text || text.length < 10) return;

            const link = $(el).find('a[href*="id="]').first();
            let nama = link.text().trim() || $(el).find('h3, h4, .title, strong').first().text().trim();
            if (!nama || nama.length < 3 || nama.toLowerCase().includes('akses') || seenNames.has(nama)) return;
            seenNames.add(nama);

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const cleanName = lines.find(l => l.length > 3 && !l.toLowerCase().includes('akses') && !l.match(/^(Senin|Selasa)/i));
            if (cleanName && cleanName.length < nama.length) nama = cleanName;

            let dosen = 'Dosen Pengampu';
            let hari = 'Sesuai Jadwal';
            let jam = 'Sesuai Jadwal';
            let ruang = 'Kelas Virtual / Offline';
            let kode = '';

            const codeMatch = text.match(/\b([A-Z]{2,4}\d{3,5})\b/);
            if (codeMatch) kode = codeMatch[1];

            const jadwalMatch = text.match(/(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]+(\d{2}:\d{2})(?:\s*(?:s\/d|-|sampai)\s*(\d{2}:\d{2}))?/i);
            if (jadwalMatch) { hari = jadwalMatch[1]; jam = jadwalMatch[2] + (jadwalMatch[3] ? ` - ${jadwalMatch[3]}` : ''); }

            const dosenText = $(el).find('[class*="dosen"], [class*="instructor"]').first().text().trim();
            if (dosenText) dosen = dosenText.replace(/dosen\s*pengampu\s*[:\s]*/i, '').trim();

            const ruangMatch = text.match(/(?:Ruang|R\.|Lab\.|Lab|Kelas)\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i);
            if (ruangMatch) ruang = ruangMatch[0];

            list.push({ nama, dosen, hari, jam, ruang, kode });
          });
          
          console.log(`[SYNC-SCRAPE] Layer 5 (HTML /mahasiswa/matakuliah): added courses, total now ${list.length}`);
        }
      }
    }
  } catch (e) {
    console.log(`[SYNC-SCRAPE] Layer 5 Error: ${(e as Error).message}`);
  }

  console.log(`[SYNC-SCRAPE] Total courses found across all layers: ${list.length}`);
  return list;
}

// ─── Helper: get or create mata_kuliah ────────────────────────────────────────
async function getOrCreateMatkul(supa: any, nama: string, prodi: string, extra?: any): Promise<string | null> {
  const { data: ex } = await supa.from('mata_kuliah').select('id, dosen, hari, jam, ruang').ilike('nama', `%${nama.substring(0, 25)}%`).maybeSingle();
  const upData = { 
    dosen: extra?.dosen || ex?.dosen || 'Dosen Pengampu',
    hari: extra?.hari || ex?.hari || 'Sesuai Jadwal',
    jam: extra?.jam || ex?.jam || 'Sesuai Jadwal',
    ruang: extra?.ruang || ex?.ruang || 'Kelas Virtual / Offline'
  };

  if (ex) {
    if (extra && (ex.dosen !== upData.dosen || ex.hari !== upData.hari || ex.jam !== upData.jam || ex.ruang !== upData.ruang)) {
      await supa.from('mata_kuliah').update(upData).eq('id', ex.id);
    }
    return ex.id;
  }
  const kode = extra?.kode || (nama.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) + Math.floor(Math.random()*10000)) || `MK${Date.now()}`;
  const { data: c, error } = await supa.from('mata_kuliah').insert({ 
    kode, nama, sks: 3, prodi, jurusan: 'Teknik Informatika', jenis: 'wajib',
    ...upData
  }).select('id').maybeSingle();
  if (error) { console.warn('[SYNC] mata_kuliah:', error.message); return null; }
  return c?.id ?? null;
}

// ─── Main POST Handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !svcKey) throw new Error('Supabase config missing');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // ── Auto-create tables if they don't exist ──
    try {
      await supa.rpc('ensure_tables_exist');
      console.log('[SYNC] ✓ Tables verified/created');
    } catch (e) {
      console.warn('[SYNC] ensure_tables_exist RPC skipped:', (e as Error).message);
    }

    // ── Identify user ──
    // Accept user_id from POST body (primary), or fallback to Authorization header
    let userId: string | null = null;

    try {
      const body = await request.json();
      if (body?.user_id) {
        userId = body.user_id;
      }
    } catch { /* body might not be JSON */ }

    // Fallback: try Authorization header
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        if (token.startsWith('bypass-token-for-')) {
          userId = token.replace('bypass-token-for-', '');
        } else if (token && token !== 'undefined' && token !== 'null') {
          try {
            const { data: { user: supaUser } } = await supa.auth.getUser(token);
            if (supaUser) userId = supaUser.id;
          } catch { /* invalid JWT, skip */ }
        }
      }
    }

    if (!userId) {
      console.log('[SYNC] No user_id provided');
      return NextResponse.json({ success: false, message: 'User ID tidak ditemukan. Silakan login ulang.' }, { status: 401 });
    }

    // Validate user exists in database
    const { data: dbUser } = await supa.from('users').select('id, email').eq('id', userId).maybeSingle();
    if (!dbUser) {
      console.log(`[SYNC] User ${userId} not found in database`);
      return NextResponse.json({ success: false, message: 'User tidak ditemukan di database. Silakan login ulang.' }, { status: 401 });
    }

    const user = { id: dbUser.id, email: dbUser.email };
    console.log(`[SYNC] ✓ User identified: ${user.email} (${user.id})`);

    // Get ETHOL cookie from DB
    const { data: session } = await supa.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', user.id).maybeSingle();
    if (!session || !session.ethol_cookie) {
      return NextResponse.json({ success: false, message: 'Sesi ETHOL tidak ditemukan. Silakan login ulang melalui ETHOL.' }, { status: 400 });
    }

    console.log(`[SYNC] Starting full sync for user ${user.id}`);

    // ── Stabilize session first ──
    let cookieStr = session.ethol_cookie;
    try {
      const stabRes = await axios.get(`${ETHOL_BASE}/my/`, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
        maxRedirects: 5, validateStatus: (s) => s < 500, timeout: 10000,
      });
      if (stabRes.status === 200) {
        const newC = parseCookies(stabRes.headers['set-cookie'] as string[] | undefined);
        const cookieObj: Record<string, string> = {};
        cookieStr.split(';').forEach((c: string) => { const idx = c.indexOf('='); if (idx > 0) cookieObj[c.slice(0, idx).trim()] = c.slice(idx+1).trim(); });
        Object.assign(cookieObj, newC);
        const updated = Object.entries(cookieObj).map(([k, v]) => `${k}=${v}`).join('; ');
        if (updated !== session.ethol_cookie) {
          await supa.from('user_ethol_sessions').update({ ethol_cookie: updated }).eq('user_id', user.id);
          cookieStr = updated;
        }
        const $stab = cheerio.load(stabRes.data as string);
        if ($stab('input[name="username"]').length > 0) {
          return NextResponse.json({ success: false, message: 'Sesi ETHOL kadaluarsa. Silakan login ulang.' }, { status: 401 });
        }
      }
    } catch (e) { console.warn('[SYNC] Session stabilization warning:', (e as Error).message); }

    // ── Get JWT Token ──
    const jwt = await etholApi.getEtholJwtToken(cookieStr);
    if (jwt) console.log('[SYNC] JWT token successfully extracted for API calls');
    else console.log('[SYNC] Failed to get JWT token, falling back to HTML scraping');

    // ── Fetch active semester beforehand to get academic parameters ──
    let tahun = 2025;
    let academicSemester = 2;
    const { data: sem } = await supa.from('semester').select('id, kode, tahun_akademik, tipe').eq('is_aktif', true).maybeSingle();
    if (sem) {
      if (sem.tahun_akademik) {
        const match = sem.tahun_akademik.match(/^(\d{4})/);
        if (match) tahun = parseInt(match[1]);
      } else if (sem.kode) {
        const match = sem.kode.match(/^(\d{4})/);
        if (match) tahun = parseInt(match[1]);
      }
      if (sem.tipe) {
        academicSemester = sem.tipe.toLowerCase() === 'ganjil' ? 1 : 2;
      } else if (sem.kode) {
        academicSemester = sem.kode.endsWith('-1') ? 1 : 2;
      }
    }
    console.log(`[SYNC] Dynamic parameters: tahun=${tahun}, semester=${academicSemester}`);

    // ── Scrape all data in parallel ──
    const [profile, nilaiList, kehadiranList, tugasList, pengumumanList, matkulDetailList, materiList, jadwalList] = await Promise.all([
      scrapeProfile(cookieStr),
      scrapeNilai(cookieStr),
      scrapeKehadiran(cookieStr),
      scrapeTugas(cookieStr, jwt, tahun, academicSemester),
      scrapePengumuman(cookieStr, jwt),
      scrapeMatakuliahDetail(cookieStr, jwt, tahun, academicSemester),
      scrapeMateri(cookieStr, jwt, tahun, academicSemester),
      scrapeJadwalKuliah(cookieStr, jwt)
    ]);

    // Check if session is expired (redirected to login)
    if (!profile.fullName && nilaiList.length === 0 && kehadiranList.length === 0 && matkulDetailList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Sesi ETHOL kadaluarsa. Silakan login ulang melalui halaman Login.',
      }, { status: 401 });
    }
    
    console.log(`[SYNC] Scraped: profil=${profile.fullName ?? '?'}, nilai=${nilaiList.length}, kehadiran=${kehadiranList.length}, tugas=${tugasList.length}, pengumuman=${pengumumanList.length}, matkul=${matkulDetailList.length}, materi=${materiList.length}, jadwal=${jadwalList.length}`);

    const prodi = profile.prodi ?? 'D3 Teknik Informatika';
    const fullName = profile.fullName ?? 'Mahasiswa PENS';
    const nrp = profile.nrp ?? `0${Date.now()}`;
    const kelas = profile.kelas ?? 'Belum Ditentukan';
    const angkatan = profile.angkatan ?? new Date().getFullYear();

    let mhsId = null;
    try {
      // Robust TS implementation to bypass outdated database RPCs
      let { data: mhs } = await supa.from('mahasiswa').select('id').eq('nrp', nrp).maybeSingle();
      if (!mhs) {
        const { data: mhsByUid } = await supa.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
        mhs = mhsByUid;
      }
      
      if (!mhs) {
        const { data: newMhs, error: insErr } = await supa.from('mahasiswa').insert({
          user_id: user.id, nrp, nama_lengkap: fullName, kelas, prodi, angkatan, dosen_wali_id: null
        }).select('id').maybeSingle();
        if (newMhs) mhsId = newMhs.id;
        else console.error('[SYNC] Failed to insert mahasiswa:', insErr);
      } else {
        mhsId = mhs.id;
        await supa.from('mahasiswa').update({
          nrp, nama_lengkap: fullName, kelas, prodi, user_id: user.id
        }).eq('id', mhsId);
      }
    } catch (e: any) {
      console.error('[SYNC] Error getting/creating mahasiswa:', e.message);
    }

    if (mhsId && sem) {
      const G: Record<string, number> = { A: 90, AB: 83, B: 74, BC: 65, C: 56, D: 46, E: 20 };

      // Upsert Matakuliah Details first
      for (const m of matkulDetailList) {
        const mk = await getOrCreateMatkul(supa, m.nama, prodi, m);
        if (mk) {
          // Force enrollment in kehadiran so it shows up in Matakuliah page!
          await supa.from('kehadiran').upsert({
            mahasiswa_id: mhsId, semester_id: sem.id, mata_kuliah_id: mk,
            total_pertemuan: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0
          }, { onConflict: 'mahasiswa_id,semester_id,mata_kuliah_id' });
        }
      }

      // Prepare Batch Data
      const batchNilai = [];
      const batchKehadiran = [];

      // Upsert Nilai
      for (const n of nilaiList) {
        const mk = await getOrCreateMatkul(supa, n.courseName, prodi);
        if (mk) {
          batchNilai.push({
            mahasiswa_id: mhsId,
            semester_id: sem.id,
            mata_kuliah_id: mk,
            nilai_tugas: null,
            nilai_uts: null,
            nilai_uas: n.nilaiAngka ?? G[n.grade.toUpperCase()] ?? 70
          });
        }
      }

      // Upsert Kehadiran
      for (const k of kehadiranList) {
        const mk = await getOrCreateMatkul(supa, k.matkul, prodi);
        if (mk) {
          batchKehadiran.push({
            mahasiswa_id: mhsId,
            semester_id: sem.id,
            mata_kuliah_id: mk,
            total_pertemuan: k.total,
            hadir: k.hadir,
            izin: 0,
            sakit: 0,
            alpha: Math.max(0, k.total - k.hadir)
          });
        }
      }

      // Call RPCs
      if (batchNilai.length > 0) await supa.rpc('upsert_nilai_batch', { data_nilai: batchNilai });
      if (batchKehadiran.length > 0) await supa.rpc('upsert_kehadiran_batch', { data_hadir: batchKehadiran });

      // Upsert Tugas
      for (const t of tugasList) {
        const mk = await getOrCreateMatkul(supa, t.matkul, prodi);
        if (mk) {
          await supa.from('tugas').upsert({
            mahasiswa_id: mhsId, mata_kuliah_id: mk, judul: t.judul, deadline: t.deadline,
            status: t.status, sumber_url: t.sumber_url
          }, { onConflict: 'mahasiswa_id,mata_kuliah_id,judul' });
        }
      }

      // Upsert Materi
      for (const m of materiList) {
        const mk = await getOrCreateMatkul(supa, m.matkul, prodi);
        if (mk) {
          await supa.from('materi').upsert({
            mata_kuliah_id: mk, judul: m.judul, deskripsi: m.deskripsi, file_url: m.file_url,
            tipe: m.file_url ? 'file' : 'teks'
          }, { onConflict: 'mata_kuliah_id,judul' });
        }
      }

      // Update Jadwal in Mata Kuliah table
      for (const j of jadwalList) {
        await getOrCreateMatkul(supa, j.matkul, prodi, {
          hari: j.hari,
          jam: j.jam,
          ruang: j.ruang,
          dosen: j.dosen !== 'Dosen Pengampu' ? j.dosen : undefined
        });
      }

      // Update IPK history
      if (nilaiList.length > 0) {
        const { data: nilaiData } = await supa.from('nilai_mahasiswa')
          .select('bobot_nilai, mata_kuliah:mata_kuliah_id(sks)')
          .eq('mahasiswa_id', mhsId)
          .eq('semester_id', sem.id);

        if (nilaiData && nilaiData.length > 0) {
          let totalSks = 0, totalBobotSks = 0;
          for (const n of nilaiData) {
            const sks = (n.mata_kuliah as any)?.sks ?? 3;
            totalSks += sks;
            totalBobotSks += (n.bobot_nilai ?? 3) * sks;
          }
          const ips = totalSks > 0 ? parseFloat((totalBobotSks / totalSks).toFixed(2)) : 0;
          await supa.from('ipk_history').upsert({
            mahasiswa_id: mhsId, semester_id: sem.id,
            ips, ipk_kumulatif: ips,
            sks_semester: totalSks, sks_kumulatif: totalSks, sks_lulus: totalSks,
          }, { onConflict: 'mahasiswa_id,semester_id' });
        }
      }
    }

    // Upsert Pengumuman (global, not per-student)
    if (pengumumanList.length > 0) {
      for (const p of pengumumanList) {
        let tanggalDate: string;
        try {
          const parsed = new Date(p.tanggal);
          tanggalDate = isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
        } catch {
          tanggalDate = new Date().toISOString().split('T')[0];
        }

        // Check if same title+date already exists to avoid duplicates
        const { data: existing } = await supa.from('pengumuman')
          .select('id').eq('judul', p.judul).eq('tanggal', tanggalDate).maybeSingle();

        if (!existing) {
          await supa.from('pengumuman').insert({
            judul: p.judul,
            publisher: p.publisher,
            tanggal: tanggalDate,
            isi: p.isi || null,
            file_url: p.file_url,
            file_name: p.file_name,
            sumber_url: p.sumber_url,
          });
        }
      }
      console.log(`[SYNC] ✓ Processed ${pengumumanList.length} pengumuman`);
    }

    // Update last_sync_at
    await supa.from('user_ethol_sessions')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi berhasil! Data terbaru: ${nilaiList.length} nilai, ${kehadiranList.length} kehadiran, ${tugasList.length} tugas, ${pengumumanList.length} pengumuman.`,
      stats: {
        profil: !!profile.fullName,
        nilai: nilaiList.length,
        kehadiran: kehadiranList.length,
        tugas: tugasList.length,
        pengumuman: pengumumanList.length,
      }
    });

  } catch (err) {
    console.error('[SYNC] Error:', err);
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
