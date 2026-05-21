/**
 * Vite Dev Middleware — hanya berjalan saat `npm run dev` (localhost).
 * Di Vercel production, endpoint /api/cas-login ditangani oleh api/cas-login.js
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import querystring from 'node:querystring';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';
const CAS_BASE        = 'https://login.pens.ac.id/cas';
const ETHOL_BASE      = 'https://ethol.pens.ac.id';
const SERVICE_URL     = `${ETHOL_BASE}/cas/`;

// ─── Stealth Browser Headers ──────────────────────────────────────────────────
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

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// ─── CAS Login ────────────────────────────────────────────────────────────────
async function casLogin(netId, password) {
  const loginUrl = `${CAS_BASE}/login?service=${encodeURIComponent(SERVICE_URL)}`;

  const initRes = await axios.get(loginUrl, {
    headers : { ...BROWSER_HEADERS },
    timeout : 20000,
  });

  let casCookies = initRes.headers['set-cookie'] || [];
  if (!casCookies.length) {
    throw new Error('CAS tidak mengembalikan cookies.');
  }

  const $    = cheerio.load(initRes.data);
  const lt        = $('input[name="lt"]').val();
  const execution = $('input[name="execution"]').val();
  const eventId   = $('input[name="_eventId"]').val() || 'submit';

  if (!lt && !execution) {
    throw new Error('Gagal mengekstrak token dari form CAS.');
  }

  await randomDelay(400, 800);

  const formPayload = { username: netId, password, _eventId: eventId, submit: 'LOGIN' };
  if (lt)        formPayload.lt        = lt;
  if (execution) formPayload.execution = execution;

  const postRes = await axios.post(loginUrl, querystring.stringify(formPayload), {
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type'  : 'application/x-www-form-urlencoded',
      'Cookie'        : cookiesToString(casCookies),
      'Referer'       : loginUrl,
      'Origin'        : 'https://login.pens.ac.id',
      'Sec-Fetch-Site': 'same-origin',
    },
    maxRedirects  : 0,
    validateStatus: s => s >= 200 && s <= 302,
    timeout       : 20000,
  });

  if (postRes.headers['set-cookie']) {
    casCookies = mergeCookies(casCookies, postRes.headers['set-cookie']);
  }

  if (postRes.status === 200) {
    const $fail   = cheerio.load(postRes.data);
    const hasForm = $fail('input[name="lt"]').val() || $fail('input[name="execution"]').val();
    const errMsg  = $fail('.alert-danger, .errors, [class*="error"]').first().text().trim();
    if (hasForm) return { success: false, message: errMsg || 'NetID atau Password salah.' };
  }

  const redirectUrl = postRes.headers.location;
  if (!redirectUrl) return { success: false, message: 'CAS tidak memberikan redirect.' };
  if (!redirectUrl.includes('ethol.pens.ac.id')) {
    return { success: false, message: 'Akun tidak memiliki akses ke ETHOL.' };
  }

  // Follow redirects manually to collect ETHOL cookies
  await randomDelay(400, 800);
  let etholCookies = [];
  let currentUrl   = redirectUrl;

  for (let i = 0; i < 5; i++) {
    const r = await axios.get(currentUrl, {
      headers: {
        ...BROWSER_HEADERS,
        'Cookie'        : cookiesToString(etholCookies.length ? etholCookies : casCookies),
        'Referer'       : i === 0 ? loginUrl : currentUrl,
        'Sec-Fetch-Site': i === 0 ? 'cross-site' : 'same-origin',
      },
      maxRedirects  : 0,
      validateStatus: s => s >= 200 && s <= 302,
      timeout       : 15000,
    });
    if (r.headers['set-cookie']) {
      etholCookies = mergeCookies(etholCookies, r.headers['set-cookie']);
    }
    if (r.status === 302 && r.headers.location) {
      const loc  = r.headers.location;
      currentUrl = loc.startsWith('http') ? loc : `${ETHOL_BASE}${loc}`;
      await randomDelay(300, 600);
    } else {
      break;
    }
  }

  return { success: true, etholCookieStr: cookiesToString(etholCookies) };
}

// ─── Scrape Profile ───────────────────────────────────────────────────────────
async function scrapeProfile(etholCookieStr) {
  const profile = { fullName: '', nrp: '', prodi: 'D3 Teknik Informatika', kelas: 'Belum ditentukan', angkatan: new Date().getFullYear() };
  const pages = [`${ETHOL_BASE}/user/profile.php`, `${ETHOL_BASE}/my/`, `${ETHOL_BASE}/`];

  for (const url of pages) {
    try {
      await randomDelay(500, 900);
      const res = await axios.get(url, {
        headers: { ...BROWSER_HEADERS, 'Cookie': etholCookieStr, 'Referer': `${ETHOL_BASE}/my/`, 'Sec-Fetch-Site': 'same-origin' },
        timeout: 15000, validateStatus: s => s < 500,
      });
      if (res.status !== 200) continue;

      const $ = cheerio.load(res.data);
      const nameSelectors = ['.userprofile .fullname','#page-header h1','.page-header-headings h1','.usermenu .usertext','.navbar .usermenu span.usertext','#user-info h2','h1.h2'];
      for (const sel of nameSelectors) {
        const t = $(sel).first().text().trim();
        if (t && t.length > 2 && !/ethol|menu|pens/i.test(t)) { profile.fullName = t; break; }
      }

      const pageText = $.text();
      const nrpMatch = pageText.match(/\b(\d{10,12})\b/) || pageText.match(/NRP[:\s]+(\d+)/i);
      if (nrpMatch) profile.nrp = nrpMatch[1];

      $('dl.list dt, .profile-userinfo dt, .contentnode dt').each((_, el) => {
        const label = $(el).text().trim().toLowerCase();
        const value = $(el).next('dd').text().trim();
        if (!value) return;
        if (/\bnama\b|full.?name/.test(label) && !profile.fullName) profile.fullName = value;
        if (/nrp|nim|student.?id/.test(label))                       profile.nrp     = value;
        if (/prodi|program.?studi/.test(label))                       profile.prodi   = value;
        if (/kelas|class/.test(label))                                profile.kelas   = value;
      });

      if (profile.nrp?.length >= 4) {
        const yr = parseInt(profile.nrp.substring(0, 4));
        if (yr >= 2000 && yr <= 2100) profile.angkatan = yr;
      }
      if (profile.fullName) break;
    } catch (e) {
      console.log(`[LOCAL CAS] Gagal scrape ${url}: ${e.message}`);
    }
  }
  return profile;
}

// ─── Scrape Nilai ─────────────────────────────────────────────────────────────
async function scrapeNilai(etholCookieStr) {
  const list = [];
  for (const url of [`${ETHOL_BASE}/grade/report/overview/index.php`, `${ETHOL_BASE}/grade/overview/index.php`]) {
    try {
      await randomDelay(600, 1200);
      const res = await axios.get(url, { headers: { ...BROWSER_HEADERS, 'Cookie': etholCookieStr, 'Referer': `${ETHOL_BASE}/my/` }, timeout: 15000, validateStatus: s => s < 500 });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data);
      $('table.generaltable tbody tr, .grade-report-overview tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const courseName = $(cells[0]).text().trim();
        const grade      = $(cells[1]).text().trim();
        if (courseName && grade && !/course name/i.test(courseName)) list.push({ courseName, grade });
      });
      if (list.length) break;
    } catch (e) { console.log(`[LOCAL CAS] Nilai error: ${e.message}`); }
  }
  return list;
}

// ─── Scrape Kehadiran ─────────────────────────────────────────────────────────
async function scrapeKehadiran(etholCookieStr) {
  const list = [];
  for (const url of [`${ETHOL_BASE}/mod/attendance/view.php`, `${ETHOL_BASE}/attendance/view.php`]) {
    try {
      await randomDelay(500, 1000);
      const res = await axios.get(url, { headers: { ...BROWSER_HEADERS, 'Cookie': etholCookieStr, 'Referer': `${ETHOL_BASE}/my/` }, timeout: 15000, validateStatus: s => s < 500 });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data);
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const matkul    = $(cells[0]).text().trim();
        const persentase = $(cells[cells.length - 1]).text().replace('%', '').trim();
        if (matkul && persentase && !/mata.?kuliah/i.test(matkul)) list.push({ matkul, persentase: parseFloat(persentase) || 0 });
      });
      if (list.length) break;
    } catch (e) { console.log(`[LOCAL CAS] Kehadiran error: ${e.message}`); }
  }
  return list;
}

// ─── Sync to Supabase ─────────────────────────────────────────────────────────
async function syncToSupabase(supaAdmin, netId, profile, nilaiList) {
  let email = netId.trim();
  if (!email.includes('@')) {
    email = /^\d+$/.test(email) ? `${email}@mhs.pens.ac.id` : `${email}@it.student.pens.ac.id`;
  }
  const isStudent = /mhs|student/i.test(email);
  const role      = isStudent ? 'mahasiswa' : 'dosen_wali';
  const fullName  = profile.fullName || email.split('@')[0].replace(/[._-]/g, ' ');
  const nrp       = profile.nrp || email.split('@')[0].replace(/\D/g, '') || '0000000000';
  const prodi     = profile.prodi || 'D3 Teknik Informatika';
  const kelas     = profile.kelas || 'Belum ditentukan';
  const angkatan  = profile.angkatan || new Date().getFullYear();

  const { data: existing } = await supaAdmin.from('users').select('id, role').eq('email', email).maybeSingle();
  let uid;
  if (existing) {
    uid = existing.id;
    await supaAdmin.auth.admin.updateUserById(uid, { password: BYPASS_PASSWORD });
  } else {
    const { data: created, error } = await supaAdmin.auth.admin.createUser({
      email, password: BYPASS_PASSWORD, email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error) throw new Error('Gagal membuat akun: ' + error.message);
    uid = created.user.id;
    await delay(800);
  }

  await supaAdmin.from('users').update({ full_name: fullName }).eq('id', uid);

  if (role === 'mahasiswa') {
    await supaAdmin.from('mahasiswa').upsert({ user_id: uid, nrp, nama_lengkap: fullName, kelas, prodi, angkatan }, { onConflict: 'user_id' });
  } else {
    await supaAdmin.from('dosen_wali').upsert({ user_id: uid, nip: nrp, nama_lengkap: fullName, prodi }, { onConflict: 'user_id' });
  }

  return { email, role, isNew: !existing };
}

// ─── Vite Plugin ─────────────────────────────────────────────────────────────
export function casProxyPlugin() {
  let env = {};
  return {
    name: 'cas-proxy-plugin',
    config(_, { mode }) {
      env = loadEnv(mode, process.cwd(), '');
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/cas-login' || req.method !== 'POST') return next();
        res.setHeader('Content-Type', 'application/json');

        try {
          const { netId, password } = await parseBody(req);
          if (!netId || !password) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ success: false, message: 'NetID dan Password wajib diisi.' }));
          }

          console.log(`[CAS] Memvalidasi ${netId}...`);

          const casResult = await casLogin(netId, password);
          if (!casResult.success) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ success: false, message: casResult.message }));
          }

          console.log(`[CAS] Login berhasil. Scraping ETHOL...`);

          const profile      = await scrapeProfile(casResult.etholCookieStr);
          const nilaiList    = await scrapeNilai(casResult.etholCookieStr);
          const kehadiranList = await scrapeKehadiran(casResult.etholCookieStr);

          console.log(`[CAS] Profil: ${profile.fullName || '(tidak ditemukan)'} | Nilai: ${nilaiList.length} | Kehadiran: ${kehadiranList.length}`);

          const supaUrl    = env.VITE_SUPABASE_URL;
          const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
          if (!supaUrl || !serviceKey) throw new Error('Konfigurasi Supabase tidak lengkap di .env');

          const supaAdmin = createClient(supaUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const userInfo = await syncToSupabase(supaAdmin, netId, profile, nilaiList);
          console.log(`[CAS] Sync selesai: ${userInfo.email} (${userInfo.role})`);

          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            email  : userInfo.email,
            role   : userInfo.role,
            isNew  : userInfo.isNew,
            scrapedProfile: { fullName: profile.fullName, nrp: profile.nrp, prodi: profile.prodi },
            scrapedNilai     : nilaiList.length,
            scrapedKehadiran : kehadiranList.length,
          }));
        } catch (err) {
          console.error('[CAS] Error:', err.message);
          res.statusCode = 500;
          const msg = err.response
            ? `HTTP ${err.response.status} dari server eksternal`
            : err.message;
          res.end(JSON.stringify({ success: false, message: msg }));
        }
      });
    },
  };
}

export { BYPASS_PASSWORD };
