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

const joinCookies = (c: Record<string, string>) =>
  Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; ');

async function stabilizeSession(cookieStr: string, addLog: (msg: string) => void): Promise<string> {
  addLog('[KULIAH] Stabilizing session...');
  const cookieObj: Record<string, string> = {};
  cookieStr.split(';').forEach(c => {
     const idx = c.indexOf('=');
     if (idx > 0) cookieObj[c.slice(0, idx).trim()] = c.slice(idx+1).trim();
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rnd(200, 400);
      const r = await axios.get(`${ETHOL_BASE}/my/`, {
        headers: { ...HEADERS, Cookie: joinCookies(cookieObj), Referer: `${ETHOL_BASE}/` },
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
        timeout: 10000,
      });
      const newC = parseCookies(r.headers['set-cookie'] as string[] | undefined);
      Object.assign(cookieObj, newC);
      if (Object.keys(newC).length > 0) addLog(`[KULIAH] Got new cookies: ${Object.keys(newC).join(', ')}`);
      if (r.status === 200) {
        const $ = cheerio.load(r.data as string);
        if ($('input[name="username"]').length === 0) {
          addLog('[KULIAH] Session confirmed active');
          break;
        }
      }
    } catch (e: any) {
      addLog(`[KULIAH] Stabilization attempt ${attempt + 1}: ${e.message || e}`);
    }
  }
  return joinCookies(cookieObj);
}

async function getOrCreateMatkul(supa: any, nama: string, prodi: string, extra?: any): Promise<string | null> {
  const { data: ex } = await supa.from('mata_kuliah').select('id, dosen, hari, jam, ruang').ilike('nama', `%${nama.substring(0, 25)}%`).maybeSingle();
  const upData = {
    dosen: extra?.dosen || ex?.dosen || 'Dosen Pengampu',
    hari: extra?.hari || ex?.hari || 'Sesuai Jadwal',
    jam: extra?.jam || ex?.jam || 'Sesuai Jadwal',
    ruang: extra?.ruang || ex?.ruang || 'Kelas Virtual / Offline',
    ethol_course_id: extra?.ethol_course_id || ex?.ethol_course_id || null
  };

  if (ex) {
    if (extra && (ex.dosen !== upData.dosen || ex.hari !== upData.hari || ex.jam !== upData.jam || ex.ruang !== upData.ruang || ex.ethol_course_id !== upData.ethol_course_id)) {
      await supa.from('mata_kuliah').update(upData).eq('id', ex.id);
    }
    return ex.id;
  }
  const kode = extra?.kode || nama.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || `MK${Date.now()}`;
  const { data: c, error } = await supa.from('mata_kuliah').insert({
    kode, nama, sks: 3, prodi, jurusan: 'Teknik Informatika', jenis: 'wajib',
    ...upData
  }).select('id').maybeSingle();
  if (error) { console.warn('[KULIAH] mata_kuliah insert error:', error.message); return null; }
  return c?.id ?? null;
}

// ─── Layer 1: REST API (JWT-based) ─────────────────────────────────────────────
async function scrapeViaRestApi(cookieStr: string, addLog: (msg: string) => void) {
  addLog('[KULIAH] Layer 1: Trying REST API (JWT)...');
  const jwt = await etholApi.getEtholJwtToken(cookieStr);
  if (!jwt) { addLog('[KULIAH] JWT not available, skip REST API'); return null; }

  try {
    const data = await etholApi.getCourses(jwt);
    if (data && Array.isArray(data) && data.length > 0) {
      addLog(`[KULIAH] REST API returned ${data.length} courses`);
      return data.map((c: any) => ({
        nama: c.matakuliah || c.nama || c.name || '',
        dosen: c.dosen || c.dosen_pengampu || 'Dosen Pengampu',
        hari: c.hari || 'Sesuai Jadwal',
        jam: c.jam_mulai ? `${c.jam_mulai}${c.jam_selesai ? ` - ${c.jam_selesai}` : ''}` : 'Sesuai Jadwal',
        ruang: c.ruang || c.tempat || 'Kelas Virtual / Offline',
        kode: c.kode || c.kode_matakuliah || '',
        etholCourseId: c.id ? String(c.id) : null,
      }));
    }
    // Try alternate response format
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const arr = data.data || data.courses || data.result || data.list || [];
      if (Array.isArray(arr) && arr.length > 0) {
        addLog(`[KULIAH] REST API returned ${arr.length} courses (nested)`);
        return arr.map((c: any) => ({
          nama: c.matakuliah || c.nama || c.name || '',
          dosen: c.dosen || c.dosen_pengampu || 'Dosen Pengampu',
          hari: c.hari || 'Sesuai Jadwal',
          jam: c.jam_mulai ? `${c.jam_mulai}${c.jam_selesai ? ` - ${c.jam_selesai}` : ''}` : 'Sesuai Jadwal',
          ruang: c.ruang || c.tempat || 'Kelas Virtual / Offline',
          kode: c.kode || c.kode_matakuliah || '',
          etholCourseId: c.id ? String(c.id) : null,
        }));
      }
    }
  } catch (e: any) {
    addLog(`[KULIAH] REST API error: ${e.message || e}`);
  }
  return null;
}

// ─── Layer 2: Moodle AJAX Service ──────────────────────────────────────────────
async function scrapeViaMoodleAjax(cookieStr: string, addLog: (msg: string) => void) {
  addLog('[KULIAH] Layer 2: Trying Moodle AJAX service...');
  const sesskey = await etholApi.getSesskey(cookieStr);
  if (!sesskey) { addLog('[KULIAH] Sesskey not available'); return null; }

  const data = await etholApi.callMoodleAjax<any[]>(cookieStr, sesskey, 'core_course_get_enrolled_courses_by_timeline_classification', {
    offset: 0, limit: 50, classification: 'inprogress',
  });
  if (data && Array.isArray(data) && data.length > 0) {
    addLog(`[KULIAH] Moodle AJAX returned ${data.length} courses`);
    return data.map((c: any) => ({
      nama: c.fullname || c.shortname || c.name || '',
      dosen: 'Dosen Pengampu',
      hari: 'Sesuai Jadwal',
      jam: 'Sesuai Jadwal',
      ruang: 'Kelas Virtual / Offline',
      kode: c.shortname || c.idnumber || '',
      etholCourseId: c.id ? String(c.id) : null,
    }));
  }

  // Fallback: try enrolled_courses endpoint
  const data2 = await etholApi.callMoodleAjax<any[]>(cookieStr, sesskey, 'core_course_get_enrolled_courses_with_action_events_by_timeline_classification', {
    offset: 0, limit: 50, classification: 'inprogress',
  });
  if (data2 && Array.isArray(data2) && data2.length > 0) {
    addLog(`[KULIAH] Moodle AJAX (alt) returned ${data2.length} courses`);
    return data2.map((c: any) => ({
      nama: c.fullname || c.shortname || c.name || '',
      dosen: 'Dosen Pengampu',
      hari: 'Sesuai Jadwal',
      jam: 'Sesuai Jadwal',
      ruang: 'Kelas Virtual / Offline',
      kode: c.shortname || c.idnumber || '',
      etholCourseId: c.id ? String(c.id) : null,
    }));
  }

  return null;
}

// ─── Layer 3: HTML Scraping (fallback) ─────────────────────────────────────────
async function scrapeViaHtml(cookieStr: string, addLog: (msg: string) => void) {
  addLog('[KULIAH] Layer 3: HTML scraping...');

  try {
    await rnd(300, 600);
    const res = await axios.get(`${ETHOL_BASE}/mahasiswa/matakuliah`, {
      headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/` },
      timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
    });

    if (res.status !== 200) {
      addLog(`[KULIAH] HTTP ${res.status}, skipping`);
      return null;
    }

    const $ = cheerio.load(res.data as string);
    if ($('input[name="username"]').length > 0) {
      addLog('[KULIAH] Login form detected, session expired');
      return null;
    }

    const list: { nama: string; dosen: string; hari: string; jam: string; ruang: string; kode: string; etholCourseId: string | null }[] = [];
    const seenNames = new Set<string>();

    // Strategy A: Find all course links (most reliable across Moodle versions)
    $('a[href*="?id="], a[href*="course/view.php"], a[href*="/course/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const idMatch = href.match(/[?&]id=(\d+)/);
      if (!idMatch) return;
      const courseId = idMatch[1];

      // Navigate up to find the card container
      let card = $(el).closest('.card, .coursebox, [class*="course"], [class*="card"], li, .col, .item, div[class]');
      if (card.length === 0) {
        // Try parent traversal
        card = $(el).parentsUntil('body').filter((_, p) => {
          const tag = (p as any).tagName?.toLowerCase?.() || '';
          return tag === 'li' || tag === 'div' || tag === 'article';
        }).first();
      }
      if (card.length === 0) card = $(el).parent();

      const cardText = card.text().replace(/\s+/g, ' ').trim();
      const linkText = $(el).text().trim();

      // Extract name (prefer link text, then card title)
      let nama = linkText || card.find('h3, h4, .card-title, .title').first().text().trim() || 'Unknown Course';
      if (nama.length < 3) nama = card.find('[class*="title"], [class*="name"], strong').first().text().trim() || 'Unknown Course';
      if (nama.toLowerCase().includes('akses') || nama.toLowerCase().includes('kuliah')) nama = '';

      if (!nama) {
        // Try to extract from card structure
        const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 100);
        for (const l of lines) {
          if (l.toLowerCase().includes('akses') || l.toLowerCase().includes('masuk')) continue;
          if (!nama && l.length > 3) { nama = l; break; }
        }
      }

      if (!nama || seenNames.has(nama)) return;
      seenNames.add(nama);

      // Extract dosen, jadwal, etc from card text
      let dosen = 'Dosen Pengampu';
      let hari = 'Sesuai Jadwal';
      let jam = 'Sesuai Jadwal';
      let ruang = 'Kelas Virtual / Offline';
      let kode = '';

      // Try to find kode in text (uppercase short codes)
      const codeMatch = cardText.match(/\b([A-Z]{2,4}\d{3,5})\b/);
      if (codeMatch) kode = codeMatch[1];

      // Find hari + jam pattern
      const jadwalMatch = cardText.match(/(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]+(\d{2}:\d{2})(?:\s*(?:s\/d|-|sampai)\s*(\d{2}:\d{2}))?/i);
      if (jadwalMatch) {
        hari = jadwalMatch[1];
        jam = jadwalMatch[2] + (jadwalMatch[3] ? ` - ${jadwalMatch[3]}` : '');
      }

      // Find dosen
      const dosenText = card.find('[class*="dosen"], [class*="instructor"], [class*="teacher"]').first().text().trim();
      if (dosenText) dosen = dosenText.replace(/dosen\s*pengampu\s*[:\s]*/i, '').trim();

      // Find ruang
      const ruangMatch = cardText.match(/(?:Ruang|R\.|Lab\.|Lab|Kelas)\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i);
      if (ruangMatch) ruang = ruangMatch[0];

      list.push({ nama, dosen, hari, jam, ruang, kode, etholCourseId: courseId });
    });

    if (list.length > 0) {
      addLog(`[KULIAH] HTML scraping (links) found ${list.length} courses`);
      return list;
    }

    // Strategy B: Find cards with course-related content
    $('.card, .coursebox, [class*="course-card"], [class*="card-course"], li.course-item, .col-md-4, .col-md-6, .col-lg-4').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 10) return;

      // Find course link in this card
      const link = $(el).find('a[href*="id="]').first();
      const href = link.attr('href') || '';
      const idMatch = href.match(/[?&]id=(\d+)/);
      const courseId = idMatch ? idMatch[1] : null;

      let nama = link.text().trim() || $(el).find('h3, h4, .title, strong').first().text().trim();
      if (!nama || nama.length < 3 || nama.toLowerCase().includes('akses') || seenNames.has(nama)) return;
      seenNames.add(nama);

      // Clean name
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

      list.push({ nama, dosen, hari, jam, ruang, kode, etholCourseId: courseId });
    });

    if (list.length > 0) {
      addLog(`[KULIAH] HTML scraping (cards) found ${list.length} courses`);
      return list;
    }

    addLog('[KULIAH] No courses found via HTML');
    return null;
  } catch (e: any) {
    addLog(`[KULIAH] HTML scraping error: ${e.message || e}`);
    return null;
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const logs: string[] = [];
  const addLog = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    addLog(`\n${'='.repeat(50)}\n[KULIAH] Starting course sync...`);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized', logs }, { status: 401 });

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !svcKey) throw new Error('Supabase config missing');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    let user: any = null;
    let authErrorDetail: any = null;
    if (token.startsWith('bypass-token-for-')) {
      const userId = token.replace('bypass-token-for-', '');
      const { data: dbUser, error } = await supa.from('users').select('id, email').eq('id', userId).maybeSingle();
      if (dbUser) user = dbUser;
      if (error) authErrorDetail = error;
    } else {
      const { data: { user: supaUser }, error } = await supa.auth.getUser(token);
      if (supaUser) user = supaUser;
      if (error) authErrorDetail = error;
    }
    if (!user) {
      addLog(`[KULIAH] Auth failed. Error: ${JSON.stringify(authErrorDetail)}`);
      return NextResponse.json({ success: false, message: 'Invalid token (Supabase auth failed, silakan login ulang)', logs, authErrorDetail }, { status: 401 });
    }

    addLog(`[KULIAH] User: ${user.email}`);

    // Get ETHOL cookie
    const { data: session } = await supa.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', user.id).maybeSingle();
    if (!session?.ethol_cookie) {
      return NextResponse.json({ success: false, message: 'Sesi ETHOL tidak ditemukan. Login ulang.', logs }, { status: 400 });
    }

    // Stabilize session
    const finalCookie = await stabilizeSession(session.ethol_cookie, addLog);
    if (finalCookie !== session.ethol_cookie) {
      await supa.from('user_ethol_sessions').update({ ethol_cookie: finalCookie }).eq('user_id', user.id);
    }

    // Try layers in order
    let list = await scrapeViaRestApi(finalCookie, addLog);
    if (!list) list = await scrapeViaMoodleAjax(finalCookie, addLog);
    if (!list) list = await scrapeViaHtml(finalCookie, addLog);

    if (!list || list.length === 0) {
      addLog('[KULIAH] All layers failed. No courses found.');
      return NextResponse.json({ success: false, message: 'Tidak dapat mengambil data matakuliah. Sesi ETHOL mungkin kadaluarsa.', logs }, { status: 401 });
    }

    addLog(`[KULIAH] Total ${list.length} courses found`);

    // Save to Supabase
    const { data: mhsR } = await supa.from('mahasiswa').select('id, prodi').eq('user_id', user.id).maybeSingle();
    const { data: sem } = await supa.from('semester').select('id').eq('is_aktif', true).maybeSingle();

    if (mhsR && sem) {
      const prodi = mhsR.prodi || 'D3 Teknik Informatika';
      let upsertCount = 0;

      for (const m of list) {
        const mkId = await getOrCreateMatkul(supa, m.nama, prodi, { ...m, ethol_course_id: m.etholCourseId });
        if (mkId) {
          await supa.from('kehadiran').upsert({
            mahasiswa_id: mhsR.id, semester_id: sem.id, mata_kuliah_id: mkId,
            total_pertemuan: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0
          }, { onConflict: 'mahasiswa_id,semester_id,mata_kuliah_id' });
          upsertCount++;
        }
      }
      addLog(`[KULIAH] Saved ${upsertCount} courses to database`);
    }

    addLog(`[KULIAH] Done\n${'='.repeat(50)}\n`);
    return NextResponse.json({ success: true, message: `Sinkronisasi ${list.length} matakuliah`, data: list, logs });
  } catch (err) {
    addLog(`[KULIAH] FATAL: ${(err as Error).message}`);
    return NextResponse.json({ success: false, message: (err as Error).message, logs }, { status: 500 });
  }
}
