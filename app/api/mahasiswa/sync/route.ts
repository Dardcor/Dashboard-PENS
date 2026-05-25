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

// ─── Scraping: Tugas (Assignments) ────────────────────────────────────────────
async function scrapeTugas(cookieStr: string, jwt: string | null) {
  const list: {
    judul: string;
    matkul: string;
    deadline: string | null;
    status: string;
    sumber_url: string;
  }[] = [];

  if (jwt) {
    try {
      const data = await etholApi.getLatestAssignments(jwt);
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

async function scrapeMatakuliahDetail(cookieStr: string, jwt: string | null) {
  const list: { nama: string; dosen: string; hari: string; jam: string; ruang: string; kode: string }[] = [];
  
  if (jwt) {
    try {
      const data = await etholApi.getCourses(jwt);
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((c: any) => {
          list.push({
            nama: c.matakuliah || c.nama || c.name || '',
            dosen: c.dosen || c.dosen_pengampu || 'Dosen Pengampu',
            hari: c.hari || 'Sesuai Jadwal',
            jam: c.jam_mulai ? `${c.jam_mulai}${c.jam_selesai ? ` - ${c.jam_selesai}` : ''}` : 'Sesuai Jadwal',
            ruang: c.ruang || c.tempat || 'Kelas Virtual / Offline',
            kode: c.kode || c.kode_matakuliah || '',
          });
        });
        console.log(`[SYNC-API] Matakuliah found: ${list.length}`);
        if (list.length > 0) return list;
      }
    } catch (e: any) {
      console.log(`[SYNC-API] Matakuliah Error: ${e.message}`);
    }
  }
  try {
    await rnd(300, 600);
    const res = await axios.get(`${ETHOL_BASE}/mahasiswa/matakuliah`, {
      headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
      timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
    });
    if (res.status === 200) {
      const $ = cheerio.load(res.data as string);
      
      // Look for cards that contain "Akses Kuliah"
      $('*').each((_, el) => {
        const textStr = $(el).text();
        if ($(el).children().length > 10) return; // ignore massive containers
        if (!textStr.toLowerCase().includes('akses kuliah')) return;
        if ($(el).prop('tagName')?.toLowerCase() === 'a') return; // ignore the button itself
        
        // Find the closest container card
        if (!$(el).hasClass('card') && !$(el).css('border') && !$(el).hasClass('col-md-6')) {
           // We might be looking at a generic div. We want the outer card wrapper.
           // If we're inside a card, let the card handle it.
           if ($(el).parents('.card').length > 0) return; 
        }

        const lines = textStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let nama = '';
        let dosen = 'Dosen Pengampu';
        let jadwal = 'Sesuai Jadwal';
        let kode = '';

        for (let i = 0; i < lines.length; i++) {
           const line = lines[i];
           if (line.toLowerCase().includes('akses kuliah')) continue;
           
           if (/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*\d{2}:\d{2}/i.test(line)) {
               jadwal = line;
           } else if (line.length <= 5 && line === line.toUpperCase() && !kode) {
               kode = line;
           } else if (!nama && line.length > 4) {
               nama = line;
           } else if (nama && line.length > 5 && dosen === 'Dosen Pengampu') {
               dosen = line;
           }
        }
        
        let hari = 'Sesuai Jadwal', jam = 'Sesuai Jadwal';
        if (jadwal !== 'Sesuai Jadwal') {
            const pts = jadwal.split(',');
            if (pts.length >= 2) { hari = pts[0].trim(); jam = pts[1].trim(); }
        }

        // Avoid adding the entire page text by checking if nama is reasonable
        if (nama && nama.length < 100 && !list.find(x => x.nama === nama)) {
          list.push({ nama, dosen, hari, jam, ruang: 'Sesuai ETHOL', kode });
        }
      });
    }
  } catch (e) { console.log(`[SYNC-SCRAPE] Matakuliah: ${(e as Error).message}`); }
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
  const kode = extra?.kode || nama.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || `MK${Date.now()}`;
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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

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

    // Validate user from JWT
    const { data: { user }, error: authError } = await supa.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.log(`[SYNC] Auth failed. Error: ${JSON.stringify(authError)}`);
      return NextResponse.json({ success: false, message: 'Invalid token (Supabase auth failed, silakan login ulang)', authError }, { status: 401 });
    }

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

    // ── Scrape all data in parallel ──
    const [profile, nilaiList, kehadiranList, tugasList, pengumumanList, matkulDetailList] = await Promise.all([
      scrapeProfile(cookieStr),
      scrapeNilai(cookieStr),
      scrapeKehadiran(cookieStr),
      scrapeTugas(cookieStr, jwt),
      scrapePengumuman(cookieStr, jwt),
      scrapeMatakuliahDetail(cookieStr, jwt),
    ]);

    // Check if session is expired (redirected to login)
    if (!profile.fullName && nilaiList.length === 0 && kehadiranList.length === 0 && matkulDetailList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Sesi ETHOL kadaluarsa. Silakan login ulang melalui halaman Login.',
      }, { status: 401 });
    }

    console.log(`[SYNC] Scraped: profil=${profile.fullName ?? '?'}, nilai=${nilaiList.length}, kehadiran=${kehadiranList.length}, tugas=${tugasList.length}, pengumuman=${pengumumanList.length}, matkul=${matkulDetailList.length}`);

    // ── Update database ──
    const prodi = profile.prodi ?? 'D3 Teknik Informatika';
    const { data: mhsR } = await supa.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
    const { data: sem } = await supa.from('semester').select('id').eq('is_aktif', true).maybeSingle();

    if (mhsR && sem) {
      const G: Record<string, number> = { A: 90, AB: 83, B: 74, BC: 65, C: 56, D: 46, E: 20 };

      // Upsert Matakuliah Details first
      for (const m of matkulDetailList) {
        const mk = await getOrCreateMatkul(supa, m.nama, prodi, m);
        if (mk) {
          // Force enrollment in kehadiran so it shows up in Matakuliah page!
          await supa.from('kehadiran').upsert({
            mahasiswa_id: mhsR.id, semester_id: sem.id, mata_kuliah_id: mk,
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
            mahasiswa_id: mhsR.id,
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
            mahasiswa_id: mhsR.id,
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

      // Upsert Tugas (delete old & re-insert fresh scraped data)
      if (tugasList.length > 0) {
        // Delete existing tugas for this student that came from ETHOL
        await supa.from('tugas').delete()
          .eq('mahasiswa_id', mhsR.id)
          .not('sumber_ethol', 'is', null);

        for (const t of tugasList) {
          const mk = t.matkul && t.matkul !== 'Dari Dasbor'
            ? await getOrCreateMatkul(supa, t.matkul, prodi)
            : null;

          // Parse deadline - try common formats
          let deadlineTs: string | null = null;
          if (t.deadline) {
            const parsed = new Date(t.deadline);
            if (!isNaN(parsed.getTime())) deadlineTs = parsed.toISOString();
          }

          await supa.from('tugas').insert({
            mahasiswa_id: mhsR.id,
            mata_kuliah_id: mk,
            judul: t.judul,
            deadline: deadlineTs,
            status: t.status,
            color: '#ef4444',
            sumber_ethol: t.sumber_url,
          });
        }
        console.log(`[SYNC] ✓ Saved ${tugasList.length} tugas`);
      }

      // Update IPK history
      if (nilaiList.length > 0) {
        const { data: nilaiData } = await supa.from('nilai_mahasiswa')
          .select('bobot_nilai, mata_kuliah:mata_kuliah_id(sks)')
          .eq('mahasiswa_id', mhsR.id)
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
            mahasiswa_id: mhsR.id, semester_id: sem.id,
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
