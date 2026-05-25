import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';

const CAS_BASE = 'https://login.pens.ac.id/cas';
const ETHOL_BASE = 'https://ethol.pens.ac.id';
const ETHOL_SERVICE = 'http://ethol.pens.ac.id/cas/';
const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';

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

async function casLoginViaRest(username: string, password: string) {
  console.log('[CAS-REST] Mencoba CAS REST API...');

  const tgtRes = await axios.post(
    `${CAS_BASE}/v1/tickets`,
    new URLSearchParams({ username, password }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 500,
      timeout: 20000,
    }
  );

  console.log(`[CAS-REST] TGT response: ${tgtRes.status}`);

  if (tgtRes.status !== 201) {
    if (tgtRes.status === 401 || tgtRes.status === 400) {
      return { success: false as const, message: 'NetID atau Password salah.', restAvailable: true };
    }
    return { success: false as const, message: '', restAvailable: false };
  }

  const tgtLocation = tgtRes.headers['location'] as string;
  if (!tgtLocation) {
    return { success: false as const, message: 'TGT tidak ditemukan.', restAvailable: true };
  }
  const tgtUrl = tgtLocation.startsWith('http') ? tgtLocation : `https://login.pens.ac.id${tgtLocation}`;
  console.log(`[CAS-REST] TGT URL: ${tgtUrl.split('/').pop()?.substring(0, 20)}...`);

  const stRes = await axios.post(
    tgtUrl,
    new URLSearchParams({ service: ETHOL_SERVICE }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Accept': '*/*',
      },
      timeout: 20000,
      validateStatus: (s) => s < 500,
    }
  );

  const ticket = typeof stRes.data === 'string' ? stRes.data.trim() : '';
  console.log(`[CAS-REST] Service Ticket: ${ticket.substring(0, 20)}...`);

  if (!ticket.startsWith('ST-')) {
    return { success: false as const, message: 'Gagal mendapatkan service ticket.', restAvailable: true };
  }

  return await followTicketToEthol(ticket);
}

async function casLoginViaForm(username: string, password: string) {
  console.log('[CAS-FORM] Mencoba CAS form login...');

  const getRes = await axios.get(`${CAS_BASE}/login`, {
    params: { service: ETHOL_SERVICE },
    headers: { ...HEADERS },
    maxRedirects: 5,
    validateStatus: (s) => s < 400,
    timeout: 30000,
  });

  const $ = cheerio.load(getRes.data as string);
  const sessionCookies = parseCookies(getRes.headers['set-cookie'] as string[] | undefined);

  const formData: Record<string, string> = {};
  $('form input').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).val() as string | undefined;
    if (name) formData[name] = value ?? '';
  });

  formData['username'] = username;
  formData['password'] = password;
  formData['_eventId'] = 'submit';

  console.log('[CAS-FORM] Form fields:', Object.keys(formData).join(', '));
  const formAction = $('form').attr('action') || '/cas/login';
  const postUrl = formAction.startsWith('http') ? formAction : `https://login.pens.ac.id${formAction}`;
  console.log('[CAS-FORM] Posting to dynamic action URL:', postUrl);

  await rnd(500, 1000);

  const postRes = await axios.post(
    postUrl,
    new URLSearchParams(formData).toString(),
    {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': joinCookies(sessionCookies),
        'Referer': `${CAS_BASE}/login?service=${encodeURIComponent(ETHOL_SERVICE)}`,
        'Origin': 'https://login.pens.ac.id',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
      timeout: 30000,
    }
  );

  const body = postRes.data as string;
  const location = postRes.headers['location'] as string | undefined;
  console.log(`[CAS-FORM] POST status: ${postRes.status}, location: ${location ?? 'none'}`);

  const FAILURES = [
    'authenticationfailure', 'invalid credentials', 'cannot be determined',
    'bad credentials', 'authentication failed', 'login failed',
    'password is a required', 'username is a required',
    'incorrect username', 'invalid username',
  ];
  if (FAILURES.some(f => body.toLowerCase().includes(f))) {
    const $err = cheerio.load(body);
    const msg = $err('.alert-danger, .errors, #status, [id*="error"], [class*="error"]').text().trim();
    return {
      success: false as const,
      message: msg || 'NetID atau Password salah.',
    };
  }

  if (location) {
    const ticketMatch = location.match(/ticket=(ST-[^&]+)/);
    if (ticketMatch) {
      return await followTicketToEthol(ticketMatch[1]);
    }
    return await followRedirectChain(location, { ...sessionCookies, ...parseCookies(postRes.headers['set-cookie'] as string[] | undefined) });
  }

  return {
    success: false as const,
    message: 'Login gagal: tidak ada redirect setelah form submission. Coba lagi.',
  };
}

async function followTicketToEthol(ticket: string) {
  const ticketUrl = `${ETHOL_SERVICE}?ticket=${ticket}`;
  console.log(`[CAS] Following ticket to ETHOL: ${ticket.substring(0, 20)}...`);
  return await followRedirectChain(ticketUrl, {});
}

async function followRedirectChain(startUrl: string, initialCookies: Record<string, string>) {
  let etholCookies: Record<string, string> = { ...initialCookies };
  let nextUrl: string | undefined = startUrl;

  // Phase 1: Follow CAS redirect chain
  for (let i = 0; i < 10 && nextUrl; i++) {
    await rnd(200, 500);
    const url = nextUrl.startsWith('http') ? nextUrl : `${ETHOL_BASE}${nextUrl}`;
    console.log(`[CAS] Redirect ${i + 1}: ${url.slice(0, 70)}`);

    const r = await axios.get(url, {
      headers: {
        ...HEADERS,
        Cookie: joinCookies(etholCookies),
        Referer: i === 0 ? `${CAS_BASE}/login` : url,
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
      timeout: 30000,
    });

    const newC = parseCookies(r.headers['set-cookie'] as string[] | undefined);
    Object.assign(etholCookies, newC);
    nextUrl = r.headers['location'] as string | undefined;

    console.log(`[CAS] Status: ${r.status}, new cookies: [${Object.keys(newC).join(', ')}]`);

    if (etholCookies['MoodleSession']) {
      console.log('[CAS] ✓ MoodleSession acquired!');
      break;
    }
  }

  // Phase 2: Visit /my/ to get MoodleSession if not yet acquired
  if (!etholCookies['MoodleSession']) {
    console.log('[CAS] MoodleSession not yet set, visiting /my/ to acquire...');
    for (let i = 0; i < 3; i++) {
      await rnd(300, 600);
      try {
        const r = await axios.get(`${ETHOL_BASE}/my/`, {
          headers: { ...HEADERS, Cookie: joinCookies(etholCookies), Referer: `${ETHOL_BASE}/` },
          maxRedirects: 5,
          validateStatus: (s) => s < 500,
          timeout: 15000,
        });
        const newC = parseCookies(r.headers['set-cookie'] as string[] | undefined);
        const before = Object.keys(etholCookies).length;
        Object.assign(etholCookies, newC);
        if (newC['MoodleSession']) {
          console.log('[CAS] ✓ MoodleSession acquired via /my/!');
          break;
        }
        if (Object.keys(newC).length > 0) {
          console.log(`[CAS] /my/ gave new cookies: [${Object.keys(newC).join(', ')}]`);
        }
        // Check if we got a real dashboard page (not login)
        const $ = cheerio.load(r.data as string);
        if ($('input[name="username"]').length === 0 && r.status === 200) {
          console.log('[CAS] ✓ Known session confirmed (no login form on /my/)');
          break;
        }
      } catch (e) {
        console.log(`[CAS] /my/ visit error: ${(e as Error).message}`);
      }
    }
  }

  if (!Object.keys(etholCookies).some(k => k.includes('Session') || k.includes('session') || k.includes('SESS'))) {
    return {
      success: false as const,
      message: 'Login CAS berhasil namun sesi ETHOL gagal dibuat. Coba lagi beberapa saat.',
    };
  }

  return { success: true as const, etholCookieStr: joinCookies(etholCookies) };
}

async function casLogin(netId: string, password: string) {
  const username = netId.trim();
  console.log(`[CAS] Menggunakan NetID lengkap untuk CAS: '${username}'`);

  try {
    const restResult = await casLoginViaRest(username, password) as any;
    if (restResult && restResult.restAvailable !== false) {
      return restResult;
    }
    console.log('[CAS] REST API tidak tersedia, beralih ke form login...');
  } catch (e) {
    console.log(`[CAS] REST API error: ${(e as Error).message}, beralih ke form login...`);
  }

  return await casLoginViaForm(username, password);
}

async function scrapeProfile(cookieStr: string) {
  const urls = [
    `${ETHOL_BASE}/my/`,
    `${ETHOL_BASE}/user/profile.php`,
    `${ETHOL_BASE}/user/edit.php`,
    `${ETHOL_BASE}/mahasiswa/beranda`,
    `${ETHOL_BASE}/mahasiswa/`,
    `${ETHOL_BASE}/cas/`,
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

      const links: string[] = [];
      $('a[href]').each((_, el) => {
        const h = $(el).attr('href') ?? '';
        if (/nilai|grade|kehadiran|attendance|presensi|report|akademik/i.test(h)) links.push(h);
      });
      if (links.length) console.log(`[SCRAPE] Discovered links: ${links.slice(0, 5).join(', ')}`);

      if (fullName || nrp) {
        console.log(`[SCRAPE] Profile: name=${fullName}, nrp=${nrp}, prodi=${prodi}`);
        return { fullName, nrp, prodi, kelas, angkatan };
      }
    } catch (e) { console.log(`[SCRAPE] Profile ${url}: ${(e as Error).message}`); }
  }
  return { fullName: null, nrp: null, prodi: null, kelas: null, angkatan: new Date().getFullYear() };
}

async function scrapeNilai(cookieStr: string) {
  const list: { courseName: string; grade: string; nilaiAngka?: number }[] = [];
  const urls = [
    `${ETHOL_BASE}/grade/report/overview/index.php`,
    `${ETHOL_BASE}/grade/report/user/index.php`,
    `${ETHOL_BASE}/mahasiswa/nilai`,
    `${ETHOL_BASE}/mahasiswa/akademik`,
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
    } catch (e) { console.log(`[SCRAPE] Nilai: ${(e as Error).message}`); }
  }
  return list;
}

async function scrapeKehadiran(cookieStr: string) {
  const list: { matkul: string; hadir: number; total: number; persentase: number }[] = [];
  const urls = [
    `${ETHOL_BASE}/mod/attendance/view.php`,
    `${ETHOL_BASE}/attendance/view.php`,
    `${ETHOL_BASE}/mahasiswa/kehadiran`,
    `${ETHOL_BASE}/mahasiswa/presensi`,
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
    } catch (e) { console.log(`[SCRAPE] Kehadiran: ${(e as Error).message}`); }
  }
  return list;
}

async function scrapeTugas(cookieStr: string) {
  const list: { judul: string; matkul: string; deadline: string | null; status: string; sumber_url: string }[] = [];
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
      $('[data-type="assign"], .event[href*="assign"], .timeline-event-list-item').each((_, el) => {
        const judul = $(el).find('.description, .event-name, a').first().text().trim();
        const deadlineRaw = $(el).find('.date, time, .description').text().trim();
        const matkul = $(el).find('.course, .mod-name, .small').text().trim() || 'Umum';
        const href = $(el).find('a').attr('href') || url;
        if (judul && judul.length > 3) {
          list.push({ judul: judul.substring(0, 255), matkul: matkul.substring(0, 100), deadline: deadlineRaw || null, status: 'Belum mengumpulkan', sumber_url: href.startsWith('http') ? href : `${ETHOL_BASE}${href}` });
        }
      });
      if (list.length) break;
    } catch (e) { console.log(`[SCRAPE] Tugas ${url}: ${(e as Error).message}`); }
  }
  return list;
}

async function scrapePengumuman(cookieStr: string) {
  const list: { judul: string; publisher: string; tanggal: string; isi: string; file_url: string | null; file_name: string | null; sumber_url: string }[] = [];
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
      $('.forumpost, .post-body, [data-region="article"]').each((_, el) => {
        const judul = $(el).find('.subject, h3, h4, .post-subject').first().text().trim();
        const publisher = $(el).find('.author, .user-info-picture, .username').first().text().trim() || 'BAAK PENS';
        const tanggal = $(el).find('.date, time, .posting').first().text().trim() || new Date().toISOString().split('T')[0];
        const isi = $(el).find('.content, .posting, p').first().text().trim().substring(0, 500);
        const fileHref = $(el).find('a[href*="file"], a[href*="download"]').attr('href');
        if (judul && judul.length > 3) {
          list.push({ judul: judul.substring(0, 255), publisher: publisher.substring(0, 100), tanggal, isi, file_url: fileHref ? (fileHref.startsWith('http') ? fileHref : `${ETHOL_BASE}${fileHref}`) : null, file_name: fileHref ? fileHref.split('/').pop() || null : null, sumber_url: url });
        }
      });
      if (list.length) break;
    } catch (e) { console.log(`[SCRAPE] Pengumuman ${url}: ${(e as Error).message}`); }
  }
  return list;
}

async function scrapeMatakuliahDetail(cookieStr: string) {
  const list: { nama: string; dosen: string; hari: string; jam: string; ruang: string; kode: string }[] = [];
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
  } catch (e) { console.log(`[SCRAPE] Matakuliah: ${(e as Error).message}`); }
  return list;
}

async function syncToSupabase(supa: any, netId: string, profile: Awaited<ReturnType<typeof scrapeProfile>>, nilaiList: Awaited<ReturnType<typeof scrapeNilai>>, kehadiranList: Awaited<ReturnType<typeof scrapeKehadiran>>, tugasList: Awaited<ReturnType<typeof scrapeTugas>>, pengumumanList: Awaited<ReturnType<typeof scrapePengumuman>>, matkulDetailList: Awaited<ReturnType<typeof scrapeMatakuliahDetail>>, etholCookieStr: string) {
  let email = netId.trim();
  if (!email.includes('@')) {
    email = /^\d+$/.test(email) ? `${email}@mhs.pens.ac.id` : `${email}@it.student.pens.ac.id`;
  }
  const isStudent = /mhs|student/i.test(email);
  const role = isStudent ? 'mahasiswa' : 'dosen_wali';
  const base = email.split('@')[0];
  const fullName = profile.fullName ?? base.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const nrp = profile.nrp ?? (base.replace(/\D/g, '') || `0${Date.now()}`);
  const prodi = profile.prodi ?? 'D3 Teknik Informatika';
  const kelas = profile.kelas ?? 'Belum Ditentukan';
  const angkatan = profile.angkatan ?? new Date().getFullYear();

  console.log(`[SYNC] email=${email}, role=${role}, name=${fullName}`);

  const { data: existing } = await supa.from('users').select('id,role').eq('email', email).maybeSingle();
  let uid: string | null = existing?.id || null;

  if (!uid) {
    try {
      const { data: rpcUid, error: re } = await supa.rpc('get_user_id_by_email', { email_addr: email });
      if (!re && rpcUid) {
        uid = rpcUid as string;
        console.log(`[SYNC] User found in auth.users via RPC: ${uid}`);
      }
    } catch (e) {
      console.warn('[SYNC] RPC lookup error:', (e as Error).message);
    }
  }

  if (uid) {
    await supa.auth.admin.updateUserById(uid, { password: BYPASS_PASSWORD, user_metadata: { full_name: fullName, role } });
    await supa.from('users').upsert({ id: uid, email, full_name: fullName, role, is_active: true });
  } else {
    const { data: created, error: ce } = await supa.auth.admin.createUser({
      email, password: BYPASS_PASSWORD, email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (ce) {
      console.error('[SYNC] Create user failed:', ce);
      throw new Error('Gagal membuat akun: ' + ce.message);
    }
    uid = created.user.id;
    await supa.from('users').upsert({ id: uid, email, full_name: fullName, role, is_active: true });
    await delay(1200);
  }

  // Save ETHOL cookie for future syncs
  await supa.from('user_ethol_sessions').upsert(
    { user_id: uid, ethol_cookie: etholCookieStr, last_sync_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  if (role === 'mahasiswa') {
    // 1. Get or Create Mahasiswa via RPC
    const { data: mhsId, error: errMhs } = await supa.rpc('get_or_create_mahasiswa', {
      p_user_id: uid,
      p_nrp: nrp,
      p_nama: fullName,
      p_kelas: kelas,
      p_prodi: prodi,
      p_angkatan: angkatan,
      p_dosen_wali_id: null
    });
    if (errMhs) console.error('[SYNC] Error RPC get_or_create_mahasiswa:', errMhs);
    
    const { data: sem } = await supa.from('semester').select('id').eq('is_aktif', true).maybeSingle();
    
    if (sem && mhsId) {
      const G: Record<string, number> = { A: 90, AB: 83, B: 74, BC: 65, C: 56, D: 46, E: 20 };

      // Upsert Matakuliah Details first
      for (const m of matkulDetailList) {
        const mk = await getOrCreateMatkul(supa, m.nama, prodi, m);
        if (mk) {
          await supa.from('kehadiran').upsert({
            mahasiswa_id: mhsId, semester_id: sem.id, mata_kuliah_id: mk,
            total_pertemuan: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0
          }, { onConflict: 'mahasiswa_id,semester_id,mata_kuliah_id' });
        }
      }

      // Prepare Batch Data
      const batchNilai = [];
      const batchKehadiran = [];

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

      // Sync Tugas
      if (tugasList.length > 0) {
        await supa.from('tugas').delete().eq('mahasiswa_id', mhsId).not('sumber_ethol', 'is', null);
        for (const t of tugasList) {
          const mk = t.matkul && t.matkul !== 'Dari Dasbor' ? await getOrCreateMatkul(supa, t.matkul, prodi) : null;
          let deadlineTs: string | null = null;
          if (t.deadline) { const p = new Date(t.deadline); if (!isNaN(p.getTime())) deadlineTs = p.toISOString(); }
          await supa.from('tugas').insert({ mahasiswa_id: mhsId, mata_kuliah_id: mk, judul: t.judul, deadline: deadlineTs, status: t.status, color: '#ef4444', sumber_ethol: t.sumber_url });
        }
      }
    }
  } else {
    const nip = nrp.replace(/\D/g, '').substring(0, 18) || base.replace(/\D/g, '').substring(0, 18) || `${Date.now()}`;
    await supa.from('dosen_wali').upsert({ user_id: uid, nip, nama_lengkap: fullName, prodi, jurusan: 'Teknik Informatika' }, { onConflict: 'user_id' });
  }

  // Sync Pengumuman (global)
  for (const p of pengumumanList) {
    let tanggalDate: string;
    try { const pd = new Date(p.tanggal); tanggalDate = isNaN(pd.getTime()) ? new Date().toISOString().split('T')[0] : pd.toISOString().split('T')[0]; }
    catch { tanggalDate = new Date().toISOString().split('T')[0]; }
    const { data: existing } = await supa.from('pengumuman').select('id').eq('judul', p.judul).eq('tanggal', tanggalDate).maybeSingle();
    if (!existing) {
      await supa.from('pengumuman').insert({ judul: p.judul, publisher: p.publisher, tanggal: tanggalDate, isi: p.isi || null, file_url: p.file_url, file_name: p.file_name, sumber_url: p.sumber_url });
    }
  }

  return { email, role, isNew: !existing, uid: uid! };
}

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

async function generateSessionTokens(jwtSecret: string, uid: string, email: string, userRole: string): Promise<{ access_token: string; refresh_token: string }> {
  const secret = new TextEncoder().encode(jwtSecret);
  const now = Math.floor(Date.now() / 1000);

  const access_token = await new SignJWT({
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    sub: uid,
    email,
    role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: email.split('@')[0], role: userRole },
    session_id: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return { access_token, refresh_token: crypto.randomUUID() };
}

export async function POST(request: NextRequest) {
  try {
    const { netId, password } = await request.json() as { netId?: string; password?: string };
    if (!netId?.trim() || !password?.trim()) {
      return NextResponse.json({ success: false, message: 'NetID dan Password wajib diisi.' }, { status: 400 });
    }

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!supaUrl || !svcKey) throw new Error('Konfigurasi Supabase belum diset.');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // ── Auto-create tables if they don't exist ──
    try {
      await supa.rpc('ensure_tables_exist');
      console.log('[CAS] ✓ Tables verified/created via RPC');
    } catch (e) {
      console.warn('[CAS] ensure_tables_exist RPC skipped (may not exist yet):', (e as Error).message);
    }

    console.log(`\n${'='.repeat(60)}\n[CAS] Memvalidasi: ${netId}`);

    const casResult = await casLogin(netId.trim(), password.trim());
    if (!casResult.success) {
      return NextResponse.json({ success: false, message: casResult.message }, { status: 401 });
    }

    console.log('[CAS] ✓ Login berhasil! Mulai scraping ETHOL (profil + nilai + kehadiran + tugas + pengumuman)...');

    const [profile, nilaiList, kehadiranList, tugasList, pengumumanList, matkulDetailList] = await Promise.all([
      scrapeProfile(casResult.etholCookieStr),
      scrapeNilai(casResult.etholCookieStr),
      scrapeKehadiran(casResult.etholCookieStr),
      scrapeTugas(casResult.etholCookieStr),
      scrapePengumuman(casResult.etholCookieStr),
      scrapeMatakuliahDetail(casResult.etholCookieStr),
    ]);

    console.log(`[CAS] Scraping done: profil=${profile.fullName ?? '?'}, nilai=${nilaiList.length}, kehadiran=${kehadiranList.length}, tugas=${tugasList.length}, pengumuman=${pengumumanList.length}, matkul=${matkulDetailList.length}`);

    const userInfo = await syncToSupabase(supa, netId.trim(), profile, nilaiList, kehadiranList, tugasList, pengumumanList, matkulDetailList, casResult.etholCookieStr);
    console.log(`[CAS] ✓ Sync selesai: ${userInfo.email} (${userInfo.role})`);

    let tokens = { access_token: '', refresh_token: '' };
    if (jwtSecret) {
      tokens = await generateSessionTokens(jwtSecret, userInfo.uid, userInfo.email, userInfo.role);
      console.log(`[CAS] ✓ Session tokens generated\n${'='.repeat(60)}\n`);
    } else {
      console.warn('[AUTH] Warning: SUPABASE_JWT_SECRET not found. Proceeding with frontend local session fallback.');
    }

    return NextResponse.json({
      success: true,
      email: userInfo.email,
      role: userInfo.role,
      isNew: userInfo.isNew,
      uid: userInfo.uid,
      fullName: profile.fullName || userInfo.email.split('@')[0],
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      stats: { nilai: nilaiList.length, kehadiran: kehadiranList.length, tugas: tugasList.length, pengumuman: pengumumanList.length },
    });

  } catch (err) {
    const e = err as Error & { response?: { status: number } };
    console.error('[CAS] Fatal:', e.message);
    const msg = e.response?.status ? `Error HTTP ${e.response.status} dari server PENS.` : e.message || 'Terjadi kesalahan internal.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
