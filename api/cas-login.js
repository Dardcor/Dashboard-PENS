import axios from 'axios';
import * as cheerio from 'cheerio';
import querystring from 'node:querystring';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Define global WebSocket for older Node versions (e.g. Node 20) used by Supabase Realtime
globalThis.WebSocket = ws;


// ─── Constants ────────────────────────────────────────────────────────────────
const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';
const CAS_BASE        = 'https://login.pens.ac.id/cas';
const ETHOL_BASE      = 'https://ethol.pens.ac.id';
const SERVICE_URL     = `${ETHOL_BASE}/cas/`;

// Realistic browser headers to avoid detection
const BROWSER_HEADERS = {
  'User-Agent'             : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept'                 : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language'        : 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding'        : 'gzip, deflate, br',
  'Connection'             : 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest'         : 'document',
  'Sec-Fetch-Mode'         : 'navigate',
  'Sec-Fetch-Site'         : 'none',
  'Sec-Fetch-User'         : '?1',
  'sec-ch-ua'              : '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile'       : '?0',
  'sec-ch-ua-platform'     : '"Windows"',
  'Cache-Control'          : 'max-age=0',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay       = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min = 400, max = 900) => delay(Math.floor(Math.random() * (max - min) + min));

function cookiesToString(cookies = []) {
  return cookies.map(c => c.split(';')[0]).join('; ');
}

function mergeCookies(existing = [], incoming = []) {
  const map = {};
  [...existing, ...incoming].forEach(c => {
    const [kv] = c.split(';');
    const [k]  = kv.split('=');
    map[k.trim()] = c;
  });
  return Object.values(map);
}

// ─── Step 1: CAS Login ────────────────────────────────────────────────────────
async function casLogin(netId, password) {
  const loginUrl = `${CAS_BASE}/login?service=${encodeURIComponent(SERVICE_URL)}`;

  // 1a. GET login page → extract tokens
  const initRes = await axios.get(loginUrl, {
    headers : { ...BROWSER_HEADERS },
    timeout : 20000,
  });

  let casCookies = initRes.headers['set-cookie'] || [];
  if (!casCookies.length) {
    throw new Error('CAS tidak mengembalikan cookies. Server CAS mungkin tidak dapat dijangkau.');
  }

  const $init   = cheerio.load(initRes.data);
  const lt       = $init('input[name="lt"]').val();
  const execution = $init('input[name="execution"]').val();
  const eventId  = $init('input[name="_eventId"]').val() || 'submit';

  if (!lt && !execution) {
    throw new Error('Gagal mengekstrak token login dari form CAS. Struktur halaman mungkin berubah.');
  }

  await randomDelay(400, 800);

  // 1b. POST credentials
  const formPayload = {
    username  : netId,
    password,
    _eventId  : eventId,
    submit    : 'LOGIN',
  };
  if (lt)        formPayload.lt        = lt;
  if (execution) formPayload.execution = execution;

  const postRes = await axios.post(loginUrl, querystring.stringify(formPayload), {
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type' : 'application/x-www-form-urlencoded',
      'Cookie'       : cookiesToString(casCookies),
      'Referer'      : loginUrl,
      'Origin'       : 'https://login.pens.ac.id',
      'Sec-Fetch-Site': 'same-origin',
    },
    maxRedirects : 0,
    validateStatus: s => s >= 200 && s <= 302,
    timeout      : 20000,
  });

  // Merge any new CAS cookies
  if (postRes.headers['set-cookie']) {
    casCookies = mergeCookies(casCookies, postRes.headers['set-cookie']);
  }

  // If still on login page → credentials wrong
  if (postRes.status === 200) {
    const $fail = cheerio.load(postRes.data);
    const errEl = $fail('.alert-danger, .errors, #status, [id*="error"], [class*="error"]').first().text().trim();
    const hasForm = $fail('input[name="lt"]').val() || $fail('input[name="execution"]').val();
    if (hasForm) {
      return { success: false, message: errEl || 'NetID atau Password salah. Periksa kembali kredensial Anda.' };
    }
  }

  const redirectUrl = postRes.headers.location;
  if (!redirectUrl) {
    return { success: false, message: 'CAS tidak memberikan redirect. Periksa kredensial Anda.' };
  }
  if (!redirectUrl.includes('ethol.pens.ac.id')) {
    return { success: false, message: 'Akun ini tidak memiliki akses ke ETHOL PENS.' };
  }

  // 1c. Follow redirect → get ETHOL session cookies
  await randomDelay(500, 1000);

  let etholCookies = [];
  let currentUrl   = redirectUrl;

  // Follow up to 5 redirects manually to collect all cookies
  for (let i = 0; i < 5; i++) {
    const requestHeaders = {
      ...BROWSER_HEADERS,
      'Referer'   : i === 0 ? loginUrl : currentUrl,
      'Sec-Fetch-Site': i === 0 ? 'cross-site' : 'same-origin',
    };
    if (etholCookies.length > 0) {
      requestHeaders['Cookie'] = cookiesToString(etholCookies);
    }

    const r = await axios.get(currentUrl, {
      headers: requestHeaders,
      maxRedirects : 0,
      validateStatus: s => s >= 200 && s <= 302,
      timeout      : 15000,
    });

    if (r.headers['set-cookie']) {
      etholCookies = mergeCookies(etholCookies, r.headers['set-cookie']);
    }

    if (r.status === 302 && r.headers.location) {
      const loc = r.headers.location;
      currentUrl = loc.startsWith('http') ? loc : `${ETHOL_BASE}${loc}`;
      await randomDelay(300, 600);
    } else {
      break;
    }
  }

  const etholCookieStr = cookiesToString(etholCookies);
  return { success: true, etholCookieStr, etholCookies };
}

// ─── Step 2: Scrape Profile ───────────────────────────────────────────────────
async function scrapeProfile(etholCookieStr) {
  const profile = {
    fullName : '',
    nrp      : '',
    prodi    : 'D3 Teknik Informatika',
    kelas    : 'Belum ditentukan',
    angkatan : new Date().getFullYear(),
    dosenWali: '',
  };

  const pagesToTry = [
    `${ETHOL_BASE}/user/profile.php`,
    `${ETHOL_BASE}/my/`,
    `${ETHOL_BASE}/`,
    `${ETHOL_BASE}/dashboard`,
  ];

  for (const url of pagesToTry) {
    try {
      await randomDelay(500, 900);
      const res = await axios.get(url, {
        headers: {
          ...BROWSER_HEADERS,
          'Cookie' : etholCookieStr,
          'Referer': `${ETHOL_BASE}/my/`,
          'Sec-Fetch-Site': 'same-origin',
        },
        timeout      : 15000,
        validateStatus: s => s < 500,
      });

      if (res.status !== 200) continue;

      const $ = cheerio.load(res.data);

      // ── Name selectors (ordered by specificity) ──
      const nameSelectors = [
        '.userprofile .fullname',
        '#page-header h1',
        '.page-header-headings h1',
        '.usermenu .usertext',
        '.navbar .usermenu span.usertext',
        '#user-info h2',
        'h1.h2',
        '[data-bind*="fullname"]',
        '.login-info a',
        '.site-header-main .usermenu .usertext',
      ];
      for (const sel of nameSelectors) {
        const t = $(sel).first().text().trim();
        if (t && t.length > 2 && !/ethol|menu|pens/i.test(t)) {
          profile.fullName = t;
          break;
        }
      }

      // ── NRP from text ──
      const pageText = $.text();
      const nrpMatch = pageText.match(/\b(\d{10,12})\b/) || pageText.match(/NRP[:\s]+(\d+)/i) || pageText.match(/NIM[:\s]+(\d+)/i);
      if (nrpMatch) profile.nrp = nrpMatch[1];

      // ── Profile fields (dl/dt pattern) ──
      $('dl.list dt, .profile-userinfo dt, .contentnode dt, .profile-usertextfields dt').each((_, el) => {
        const label = $(el).text().trim().toLowerCase();
        const value = $(el).next('dd').text().trim();
        if (!value) return;
        if (/\bnama\b|full.?name/.test(label) && !profile.fullName) profile.fullName   = value;
        if (/nrp|nim|student.?id/.test(label))                       profile.nrp       = value;
        if (/prodi|program.?studi|department/.test(label))            profile.prodi     = value;
        if (/kelas|class/.test(label))                                profile.kelas     = value;
        if (/dosen.?wali|advisor|pembimbing/.test(label))             profile.dosenWali = value;
      });

      // Extract angkatan from NRP (usually first 4 digits = year)
      if (profile.nrp && profile.nrp.length >= 4) {
        const yr = parseInt(profile.nrp.substring(0, 4));
        if (yr >= 2000 && yr <= 2100) profile.angkatan = yr;
      }

      if (profile.fullName) break;
    } catch (e) {
      console.log(`[SCRAPE] Gagal scrape ${url}: ${e.message}`);
    }
  }

  return profile;
}

// ─── Step 3: Scrape Nilai (Grades) ───────────────────────────────────────────
async function scrapeNilai(etholCookieStr) {
  const nilaiList = [];
  const urls = [
    `${ETHOL_BASE}/grade/report/overview/index.php`,
    `${ETHOL_BASE}/grade/overview/index.php`,
  ];

  for (const url of urls) {
    try {
      await randomDelay(600, 1200);
      const res = await axios.get(url, {
        headers: {
          ...BROWSER_HEADERS,
          'Cookie' : etholCookieStr,
          'Referer': `${ETHOL_BASE}/my/`,
        },
        timeout      : 15000,
        validateStatus: s => s < 500,
      });
      if (res.status !== 200) continue;

      const $ = cheerio.load(res.data);
      $('table.generaltable tbody tr, table.grades tbody tr, .grade-report-overview tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const courseName = $(cells[0]).text().trim();
        const grade      = $(cells[1]).text().trim();
        if (courseName && grade && !/course name/i.test(courseName)) {
          nilaiList.push({ courseName, grade });
        }
      });
      if (nilaiList.length) break;
    } catch (e) {
      console.log(`[SCRAPE] Nilai error ${url}: ${e.message}`);
    }
  }
  return nilaiList;
}

// ─── Step 4: Scrape Kehadiran (Attendance) ────────────────────────────────────
async function scrapeKehadiran(etholCookieStr) {
  const kehadiranList = [];
  const urls = [
    `${ETHOL_BASE}/mod/attendance/view.php`,
    `${ETHOL_BASE}/attendance/view.php`,
    `${ETHOL_BASE}/mod/attendance/index.php`,
  ];

  for (const url of urls) {
    try {
      await randomDelay(500, 1000);
      const res = await axios.get(url, {
        headers: {
          ...BROWSER_HEADERS,
          'Cookie' : etholCookieStr,
          'Referer': `${ETHOL_BASE}/my/`,
        },
        timeout      : 15000,
        validateStatus: s => s < 500,
      });
      if (res.status !== 200) continue;

      const $ = cheerio.load(res.data);
      $('table tbody tr').each((_, row) => {
        const cells     = $(row).find('td');
        if (cells.length < 2) return;
        const matkul    = $(cells[0]).text().trim();
        const persentase = $(cells[cells.length - 1]).text().replace('%', '').trim();
        if (matkul && persentase && !/mata.?kuliah|course/i.test(matkul)) {
          kehadiranList.push({ matkul, persentase: parseFloat(persentase) || 0 });
        }
      });
      if (kehadiranList.length) break;
    } catch (e) {
      console.log(`[SCRAPE] Kehadiran error ${url}: ${e.message}`);
    }
  }
  return kehadiranList;
}

// ─── Step 5: Sync to Supabase ─────────────────────────────────────────────────
async function syncToSupabase(supaAdmin, netId, profile, nilaiList, kehadiranList) {
  let email = netId.trim();
  if (!email.includes('@')) {
    const isNumeric = /^\d+$/.test(email);
    email = isNumeric ? `${email}@mhs.pens.ac.id` : `${email}@it.student.pens.ac.id`;
  }

  const isStudent = /mhs|student/i.test(email);
  const role      = isStudent ? 'mahasiswa' : 'dosen_wali';

  const fullName  = profile.fullName  || email.split('@')[0].replace(/[._-]/g, ' ');
  const nrp       = profile.nrp       || email.split('@')[0].replace(/\D/g, '') || '0000000000';
  const prodi     = profile.prodi     || 'D3 Teknik Informatika';
  const kelas     = profile.kelas     || 'Belum ditentukan';
  const angkatan  = profile.angkatan  || new Date().getFullYear();

  // Check existing user
  const { data: existing } = await supaAdmin
    .from('users').select('id, role').eq('email', email).maybeSingle();

  let uid;
  if (existing) {
    uid = existing.id;
    await supaAdmin.auth.admin.updateUserById(uid, { password: BYPASS_PASSWORD });
  } else {
    const { data: created, error: createErr } = await supaAdmin.auth.admin.createUser({
      email,
      password       : BYPASS_PASSWORD,
      email_confirm  : true,
      user_metadata  : { full_name: fullName, role },
    });
    if (createErr) throw new Error('Gagal membuat akun: ' + createErr.message);
    uid = created.user.id;
    await delay(800); // Wait for trigger
  }

  // Update public.users
  await supaAdmin.from('users').update({ full_name: fullName }).eq('id', uid);

  // Upsert role-specific profile
  if (role === 'mahasiswa') {
    const { error: mhsErr } = await supaAdmin.from('mahasiswa').upsert({
      user_id     : uid,
      nrp,
      nama_lengkap: fullName,
      kelas,
      prodi,
      angkatan,
    }, { onConflict: 'user_id' });
    if (mhsErr) console.log('[SYNC] mahasiswa upsert warning:', mhsErr.message);

    // Sync nilai if scraped
    if (nilaiList.length > 0) {
      // Get current active semester
      const { data: semData } = await supaAdmin
        .from('semester').select('id').eq('is_aktif', true).maybeSingle();

      if (semData) {
        const { data: mhsData } = await supaAdmin
          .from('mahasiswa').select('id').eq('user_id', uid).maybeSingle();

        if (mhsData) {
          for (const nilai of nilaiList) {
            // Find or create mata kuliah
            const { data: mkData } = await supaAdmin
              .from('mata_kuliah').select('id').ilike('nama', `%${nilai.courseName}%`).maybeSingle();

            if (mkData) {
              await supaAdmin.from('nilai_mahasiswa').upsert({
                mahasiswa_id  : mhsData.id,
                semester_id   : semData.id,
                mata_kuliah_id: mkData.id,
              }, { onConflict: 'mahasiswa_id,semester_id,mata_kuliah_id', ignoreDuplicates: true });
            }
          }
        }
      }
    }

  } else {
    const { error: dwErr } = await supaAdmin.from('dosen_wali').upsert({
      user_id     : uid,
      nip         : nrp,
      nama_lengkap: fullName,
      prodi,
    }, { onConflict: 'user_id' });
    if (dwErr) console.log('[SYNC] dosen_wali upsert warning:', dwErr.message);
  }

  return { email, role, uid, isNew: !existing };
}

// ─── Vercel Handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const { netId, password } = req.body || {};
    if (!netId || !password) {
      return res.status(400).json({ success: false, message: 'NetID dan Password wajib diisi.' });
    }

    const supaUrl    = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !serviceKey) {
      throw new Error('Konfigurasi Supabase tidak ditemukan. Pastikan environment variables sudah diset di Vercel.');
    }

    const supaAdmin = createClient(supaUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`[CAS] Memvalidasi ${netId}...`);

    // Step 1: CAS Login + get ETHOL session
    const casResult = await casLogin(netId, password);
    if (!casResult.success) {
      return res.status(401).json({ success: false, message: casResult.message });
    }
    console.log(`[CAS] Login berhasil. Mengambil data ETHOL...`);

    // Step 2: Scrape profile
    const profile = await scrapeProfile(casResult.etholCookieStr);
    console.log(`[CAS] Profil: ${profile.fullName || '(tidak ditemukan)'}, NRP: ${profile.nrp || '(tidak ditemukan)'}`);

    // Step 3: Scrape nilai (best effort)
    const nilaiList = await scrapeNilai(casResult.etholCookieStr);
    console.log(`[CAS] Nilai scraped: ${nilaiList.length} mata kuliah`);

    // Step 4: Scrape kehadiran (best effort)
    const kehadiranList = await scrapeKehadiran(casResult.etholCookieStr);
    console.log(`[CAS] Kehadiran scraped: ${kehadiranList.length} mata kuliah`);

    // Step 5: Sync to Supabase
    console.log(`[CAS] Menyinkronkan ke Supabase...`);
    const userInfo = await syncToSupabase(supaAdmin, netId, profile, nilaiList, kehadiranList);
    console.log(`[CAS] Sinkronisasi selesai: ${userInfo.email} (${userInfo.role})`);

    return res.status(200).json({
      success      : true,
      email        : userInfo.email,
      role         : userInfo.role,
      isNew        : userInfo.isNew,
      scrapedProfile: {
        fullName : profile.fullName,
        nrp      : profile.nrp,
        prodi    : profile.prodi,
        kelas    : profile.kelas,
      },
      scrapedNilai     : nilaiList.length,
      scrapedKehadiran : kehadiranList.length,
    });

  } catch (err) {
    console.error('[CAS] Error:', err);
    const httpStatus = err.response?.status;
    const message = httpStatus
      ? `Error HTTP ${httpStatus} dari server eksternal. Coba lagi nanti.`
      : (err.message || 'Terjadi kesalahan internal.');
    return res.status(500).json({ success: false, message });
  }
}
