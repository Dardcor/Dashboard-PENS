import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ─── Constants ────────────────────────────────────────────────────────────────
const CAS_BASE        = 'https://login.pens.ac.id/cas';
const ETHOL_BASE      = 'https://ethol.pens.ac.id';
const ETHOL_SERVICE   = 'http://ethol.pens.ac.id/cas/';
const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent'     : UA,
  'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rnd   = (a: number, b: number) => delay(Math.floor(Math.random() * (b - a + 1)) + a);

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

// ─── Method A: CAS REST API (v2/v3) ──────────────────────────────────────────
async function casLoginViaRest(username: string, password: string) {
  console.log('[CAS-REST] Mencoba CAS REST API...');

  // Step A1: Request Ticket Granting Ticket (TGT)
  const tgtRes = await axios.post(
    `${CAS_BASE}/v1/tickets`,
    new URLSearchParams({ username, password }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent'  : UA,
        'Accept'      : 'application/json, text/plain, */*',
      },
      maxRedirects  : 0,
      validateStatus: (s) => s < 500,
      timeout: 20000,
    }
  );

  console.log(`[CAS-REST] TGT response: ${tgtRes.status}`);

  if (tgtRes.status !== 201) {
    // REST API not available or wrong credentials
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

  // Step A2: Exchange TGT for Service Ticket (ST)
  const stRes = await axios.post(
    tgtUrl,
    new URLSearchParams({ service: ETHOL_SERVICE }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent'  : UA,
        'Accept'      : '*/*',
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

  // Step A3: Use Service Ticket to login to ETHOL/Moodle
  return await followTicketToEthol(ticket);
}

// ─── Method B: CAS Form Login (Fallback) ─────────────────────────────────────
async function casLoginViaForm(username: string, password: string) {
  console.log('[CAS-FORM] Mencoba CAS form login...');

  // B1: GET login page — collect ALL hidden fields + session cookies
  const getRes = await axios.get(`${CAS_BASE}/login`, {
    params : { service: ETHOL_SERVICE },
    headers: { ...HEADERS },
    maxRedirects : 5,
    validateStatus: (s) => s < 400,
    timeout: 30000,
  });

  const $ = cheerio.load(getRes.data as string);
  const sessionCookies = parseCookies(getRes.headers['set-cookie'] as string[] | undefined);

  // Extract ALL form fields dynamically
  const formData: Record<string, string> = {};
  $('form input').each((_, el) => {
    const name  = $(el).attr('name');
    const value = $(el).val() as string | undefined;
    if (name) formData[name] = value ?? '';
  });

  // Override with our credentials
  formData['username']  = username;
  formData['password']  = password;
  formData['_eventId']  = 'submit';

  console.log('[CAS-FORM] Form fields:', Object.keys(formData).join(', '));
  // Extract form action dynamically (very important for Spring CAS session tracking)
  const formAction = $('form').attr('action') || '/cas/login';
  const postUrl = formAction.startsWith('http') ? formAction : `https://login.pens.ac.id${formAction}`;
  console.log('[CAS-FORM] Posting to dynamic action URL:', postUrl);

  await rnd(500, 1000);

  // B2: POST the form to the dynamically extracted action URL
  const postRes = await axios.post(
    postUrl,
    new URLSearchParams(formData).toString(),
    {
      headers: {
        ...HEADERS,
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'Cookie'        : joinCookies(sessionCookies),
        'Referer'       : `${CAS_BASE}/login?service=${encodeURIComponent(ETHOL_SERVICE)}`,
        'Origin'        : 'https://login.pens.ac.id',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
      },
      maxRedirects  : 0,
      validateStatus: (s) => s < 400,
      timeout: 30000,
    }
  );

  const body     = postRes.data as string;
  const location = postRes.headers['location'] as string | undefined;
  console.log(`[CAS-FORM] POST status: ${postRes.status}, location: ${location ?? 'none'}`);

  // Detect failure messages
  const FAILURES = [
    'authenticationfailure', 'invalid credentials', 'cannot be determined',
    'bad credentials', 'authentication failed', 'login failed',
    'password is a required', 'username is a required',
    'incorrect username', 'invalid username',
  ];
  if (FAILURES.some(f => body.toLowerCase().includes(f))) {
    const $err = cheerio.load(body);
    const msg  = $err('.alert-danger, .errors, #status, [id*="error"], [class*="error"]').text().trim();
    return {
      success: false as const,
      message: msg || 'NetID atau Password salah.',
    };
  }

  // If we got a location, extract ticket from it
  if (location) {
    const ticketMatch = location.match(/ticket=(ST-[^&]+)/);
    if (ticketMatch) {
      return await followTicketToEthol(ticketMatch[1]);
    }
    // Follow redirect manually
    return await followRedirectChain(location, { ...sessionCookies, ...parseCookies(postRes.headers['set-cookie'] as string[] | undefined) });
  }

  return {
    success: false as const,
    message: 'Login gagal: tidak ada redirect setelah form submission. Coba lagi.',
  };
}

// ─── Follow ticket URL to get ETHOL session cookies ───────────────────────────
async function followTicketToEthol(ticket: string) {
  const ticketUrl = `${ETHOL_SERVICE}?ticket=${ticket}`;
  console.log(`[CAS] Following ticket to ETHOL: ${ticket.substring(0, 20)}...`);
  return await followRedirectChain(ticketUrl, {});
}

// ─── Follow redirect chain to collect MoodleSession ───────────────────────────
async function followRedirectChain(startUrl: string, initialCookies: Record<string, string>) {
  let etholCookies: Record<string, string> = { ...initialCookies };
  let nextUrl: string | undefined = startUrl;

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
      maxRedirects  : 0,
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

  if (!Object.keys(etholCookies).some(k => k.includes('Session') || k.includes('session') || k.includes('SESS'))) {
    return {
      success: false as const,
      message: 'Login CAS berhasil namun sesi ETHOL gagal dibuat. Coba lagi beberapa saat.',
    };
  }

  return { success: true as const, etholCookieStr: joinCookies(etholCookies) };
}

// ─── Main CAS Login (REST first, form fallback) ───────────────────────────────
async function casLogin(netId: string, password: string) {
  // ⚠️ PENTING: Jangan dipotong domainnya. Gunakan NetID lengkap yang diinput user!
  const username = netId.trim();
  console.log(`[CAS] Menggunakan NetID lengkap untuk CAS: '${username}'`);

  // Try REST API first
  try {
    const restResult = await casLoginViaRest(username, password) as any;
    if (restResult && restResult.restAvailable !== false) {
      // REST API responded — use its result (success or credential failure)
      return restResult;
    }
    // REST API not available (404/405), fall through to form login
    console.log('[CAS] REST API tidak tersedia, beralih ke form login...');
  } catch (e) {
    console.log(`[CAS] REST API error: ${(e as Error).message}, beralih ke form login...`);
  }

  // Fall back to form login
  return await casLoginViaForm(username, password);
}

// ─── Step 2: Scrape Profile ───────────────────────────────────────────────────
async function scrapeProfile(cookieStr: string) {
  for (const url of [`${ETHOL_BASE}/user/profile.php`, `${ETHOL_BASE}/user/edit.php`, `${ETHOL_BASE}/my/`]) {
    try {
      await rnd(400, 800);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/my/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      if ($('input[name="username"]').length) continue; // login page

      const fullName =
        $('h1.page-header-headings span').first().text().trim() ||
        $('h1[class*="title"]').first().text().trim() ||
        $('h1.fullname').first().text().trim() || null;

      const bodyText = $('body').text().replace(/\s+/g, ' ');
      const nrp      = bodyText.match(/\b(\d{10})\b/)?.[1] ?? null;
      const prodi    = bodyText.match(/D[34]\s+Teknik\s+\w+(?:\s+\w+)?/i)?.[0]?.trim() ?? null;
      const kelas    = bodyText.match(/\b([1-4]\s*[A-Z]{2}\s*[A-Z])\b/)?.[1]?.trim() ?? null;
      const angkatan = parseInt(bodyText.match(/\b(20\d{2})\b/)?.[1] ?? '') || new Date().getFullYear();

      if (fullName || nrp) {
        console.log(`[SCRAPE] Profile: name=${fullName}, nrp=${nrp}, prodi=${prodi}`);
        return { fullName, nrp, prodi, kelas, angkatan };
      }
    } catch (e) { console.log(`[SCRAPE] Profile ${url}: ${(e as Error).message}`); }
  }
  return { fullName: null, nrp: null, prodi: null, kelas: null, angkatan: new Date().getFullYear() };
}

// ─── Step 3: Scrape Nilai ─────────────────────────────────────────────────────
async function scrapeNilai(cookieStr: string) {
  const list: { courseName: string; grade: string; nilaiAngka?: number }[] = [];
  for (const url of [`${ETHOL_BASE}/grade/report/overview/index.php`, `${ETHOL_BASE}/grade/report/user/index.php`]) {
    try {
      await rnd(400, 800);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/my/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const name = $(cells[0]).text().trim();
        const raw  = $(cells[cells.length - 1]).text().trim();
        if (!name || /course name|nama/i.test(name)) return;
        const n = raw.match(/[\d.]+/);
        list.push({ courseName: name, grade: raw.substring(0, 5), nilaiAngka: n ? parseFloat(n[0]) : undefined });
      });
      if (list.length) break;
    } catch (e) { console.log(`[SCRAPE] Nilai: ${(e as Error).message}`); }
  }
  return list;
}

// ─── Step 4: Scrape Kehadiran ─────────────────────────────────────────────────
async function scrapeKehadiran(cookieStr: string) {
  const list: { matkul: string; hadir: number; total: number; persentase: number }[] = [];
  for (const url of [`${ETHOL_BASE}/mod/attendance/view.php`, `${ETHOL_BASE}/attendance/view.php`]) {
    try {
      await rnd(400, 800);
      const res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: cookieStr, Referer: `${ETHOL_BASE}/my/` },
        timeout: 20000, maxRedirects: 5, validateStatus: (s) => s < 500,
      });
      if (res.status !== 200) continue;
      const $ = cheerio.load(res.data as string);
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const matkul = $(cells[0]).text().trim();
        const pct    = parseFloat($(cells[cells.length - 1]).text().replace('%', '').trim());
        if (!matkul || isNaN(pct) || /mata.?kuliah|course/i.test(matkul)) return;
        const m = $(cells[1]).text().match(/(\d+)\/(\d+)/);
        list.push({ matkul, hadir: m ? parseInt(m[1]) : Math.round(16 * pct / 100), total: m ? parseInt(m[2]) : 16, persentase: pct });
      });
      if (list.length) break;
    } catch (e) { console.log(`[SCRAPE] Kehadiran: ${(e as Error).message}`); }
  }
  return list;
}

// ─── Step 5: Sync to Supabase ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncToSupabase(supa: any, netId: string, profile: Awaited<ReturnType<typeof scrapeProfile>>, nilaiList: Awaited<ReturnType<typeof scrapeNilai>>, kehadiranList: Awaited<ReturnType<typeof scrapeKehadiran>>) {
  let email = netId.trim();
  if (!email.includes('@')) {
    email = /^\d+$/.test(email) ? `${email}@mhs.pens.ac.id` : `${email}@it.student.pens.ac.id`;
  }
  const isStudent = /mhs|student/i.test(email);
  const role      = isStudent ? 'mahasiswa' : 'dosen_wali';
  const base      = email.split('@')[0];
  const fullName  = profile.fullName ?? base.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const nrp       = profile.nrp ?? (base.replace(/\D/g, '') || `0${Date.now()}`);
  const prodi     = profile.prodi ?? 'D3 Teknik Informatika';
  const kelas     = profile.kelas ?? 'Belum Ditentukan';
  const angkatan  = profile.angkatan ?? new Date().getFullYear();

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

  if (role === 'mahasiswa') {
    await supa.from('mahasiswa').upsert(
      { user_id: uid, nrp, nama_lengkap: fullName, kelas, prodi, jurusan: 'Teknik Informatika', angkatan, status_akademik: 'aktif' },
      { onConflict: 'user_id' }
    );
    const { data: sem  } = await supa.from('semester').select('id').eq('is_aktif', true).maybeSingle();
    const { data: mhsR } = await supa.from('mahasiswa').select('id').eq('user_id', uid).maybeSingle();
    if (sem && mhsR) {
      const G: Record<string, number> = { A: 90, AB: 83, B: 74, BC: 65, C: 56, D: 46, E: 20 };
      for (const n of nilaiList) {
        const mk = await getOrCreateMatkul(supa, n.courseName, prodi);
        if (mk) await supa.from('nilai_mahasiswa').upsert({ mahasiswa_id: mhsR.id, semester_id: sem.id, mata_kuliah_id: mk, nilai_uas: n.nilaiAngka ?? G[n.grade.toUpperCase()] ?? 70 }, { onConflict: 'mahasiswa_id,semester_id,mata_kuliah_id' });
      }
      for (const k of kehadiranList) {
        const mk = await getOrCreateMatkul(supa, k.matkul, prodi);
        if (mk) await supa.from('kehadiran').upsert({ mahasiswa_id: mhsR.id, semester_id: sem.id, mata_kuliah_id: mk, total_pertemuan: k.total, hadir: k.hadir, izin: 0, sakit: 0, alpha: Math.max(0, k.total - k.hadir) }, { onConflict: 'mahasiswa_id,semester_id,mata_kuliah_id' });
      }
    }
  } else {
    const nip = nrp.replace(/\D/g, '').substring(0, 18) || base.replace(/\D/g, '').substring(0, 18) || `${Date.now()}`;
    await supa.from('dosen_wali').upsert({ user_id: uid, nip, nama_lengkap: fullName, prodi, jurusan: 'Teknik Informatika' }, { onConflict: 'user_id' });
  }

  return { email, role, isNew: !existing };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrCreateMatkul(supa: any, nama: string, prodi: string): Promise<string | null> {
  const { data: ex } = await supa.from('mata_kuliah').select('id').ilike('nama', `%${nama.substring(0, 25)}%`).maybeSingle();
  if (ex) return ex.id;
  const kode = nama.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || `MK${Date.now()}`;
  const { data: c, error } = await supa.from('mata_kuliah').insert({ kode, nama, sks: 3, prodi, jurusan: 'Teknik Informatika', jenis: 'wajib' }).select('id').maybeSingle();
  if (error) { console.warn('[SYNC] mata_kuliah:', error.message); return null; }
  return c?.id ?? null;
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { netId, password } = await request.json() as { netId?: string; password?: string };
    if (!netId?.trim() || !password?.trim()) {
      return NextResponse.json({ success: false, message: 'NetID dan Password wajib diisi.' }, { status: 400 });
    }

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !svcKey) throw new Error('Konfigurasi Supabase belum diset.');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    console.log(`\n${'='.repeat(60)}\n[CAS] Memvalidasi: ${netId}`);

    const casResult = await casLogin(netId.trim(), password.trim());
    if (!casResult.success) {
      return NextResponse.json({ success: false, message: casResult.message }, { status: 401 });
    }

    console.log('[CAS] ✓ Login berhasil! Mulai scraping ETHOL...');

    const [profile, nilaiList, kehadiranList] = await Promise.all([
      scrapeProfile(casResult.etholCookieStr),
      scrapeNilai(casResult.etholCookieStr),
      scrapeKehadiran(casResult.etholCookieStr),
    ]);

    console.log(`[CAS] Scraping done: profil=${profile.fullName ?? '?'}, nilai=${nilaiList.length}, kehadiran=${kehadiranList.length}`);

    const userInfo = await syncToSupabase(supa, netId.trim(), profile, nilaiList, kehadiranList);
    console.log(`[CAS] ✓ Sync selesai: ${userInfo.email} (${userInfo.role})\n${'='.repeat(60)}\n`);

    return NextResponse.json({ success: true, email: userInfo.email, role: userInfo.role, isNew: userInfo.isNew, scrapedProfile: profile, scrapedNilai: nilaiList.length, scrapedKehadiran: kehadiranList.length });

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
