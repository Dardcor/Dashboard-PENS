import axios from 'axios';
import * as cheerio from 'cheerio';
import querystring from 'node:querystring';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const BYPASS_PASSWORD = 'pens_cas_bypass_2026!';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ── Validate CAS and scrape ETHOL ──
async function validateCASAndScrape(netId, password) {
  // We want to login to CAS with service=ETHOL
  const serviceUrl = 'https://ethol.pens.ac.id/cas/';
  const loginPageUrl = `https://login.pens.ac.id/cas/login?service=${encodeURIComponent(serviceUrl)}`;
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 1a. GET login page -> extract CSRF token and cookies
  const initRes = await axios.get(loginPageUrl, { headers: { 'User-Agent': ua } });
  const casCookies = initRes.headers['set-cookie'];
  if (!casCookies) throw new Error('Gagal mendapatkan cookies dari server CAS.');

  const $ = cheerio.load(initRes.data);
  const lt = $('input[name="lt"]').val();
  const execution = $('input[name="execution"]').val();
  const eventId = $('input[name="_eventId"]').val() || 'submit';
  
  if (!lt) throw new Error('Gagal mengekstrak Login Ticket dari form CAS.');

  // 1b. POST credentials
  const formData = querystring.stringify({ username: netId, password, lt, execution, _eventId: eventId });
  const postRes = await axios.post(loginPageUrl, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': casCookies.map(c => c.split(';')[0]).join('; '),
      'User-Agent': ua,
      'Referer': loginPageUrl,
    },
    maxRedirects: 0, // We want to capture the redirect to ETHOL
    validateStatus: s => s >= 200 && s <= 302,
  });

  if (postRes.status !== 302 && postRes.data && postRes.data.includes('name="lt"')) {
    return { success: false, message: 'Kredensial salah' };
  }

  // 1c. Follow redirect to ETHOL to get session
  const redirectUrl = postRes.headers.location;
  if (!redirectUrl || !redirectUrl.includes('ethol.pens.ac.id')) {
     return { success: true, isScraped: false };
  }

  let fullName = '';
  let nrp = '';
  let prodi = 'D3 Teknik Informatika'; // Default

  try {
    const etholRes = await axios.get(redirectUrl, {
      headers: { 'User-Agent': ua },
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s <= 302,
    });

    const etholCookies = etholRes.headers['set-cookie'];
    if (etholCookies) {
      // 1d. Access ETHOL Dashboard/Profile to get real data
      const etholDashRes = await axios.get('https://ethol.pens.ac.id/dashboard', {
         headers: {
            'User-Agent': ua,
            'Cookie': etholCookies.map(c => c.split(';')[0]).join('; ')
         },
         validateStatus: s => s >= 200 && s < 500, // Don't throw on 404
      });

      if (etholDashRes.status === 200) {
        const $dash = cheerio.load(etholDashRes.data);
        const profileText = $dash('.user-profile-name, .user-name, .profile-name, h3').first().text().trim();
        if (profileText) fullName = profileText;
      }
    }
  } catch (scrapingErr) {
    console.log("[CAS] Scraping failed or ETHOL error, proceeding with basic info:", scrapingErr.message);
  }

  return { 
      success: true, 
      isScraped: !!fullName, 
      scrapedData: { fullName, nrp, prodi }
  };
}

// ── Ensure user in Supabase ──
async function ensureUser(supaAdmin, netId, scrapedData) {
  let email = netId.trim();
  if (!email.includes('@')) email = `${email}@it.student.pens.ac.id`;

  const isStudent = email.includes('student');
  const role = isStudent ? 'mahasiswa' : 'dosen_wali';
  
  // Use scraped data or fallback to parsing email
  let fullName = scrapedData?.fullName || email.split('@')[0].replace(/[._]/g, ' ');
  let nrp = scrapedData?.nrp || email.split('@')[0].replace(/[^0-9]/g, '') || '0000000000';
  let prodi = scrapedData?.prodi || 'D3 Teknik Informatika';

  // Check public.users first
  const { data: existing } = await supaAdmin
    .from('users').select('id, role').eq('email', email).maybeSingle();

  let uid;

  if (existing) {
    uid = existing.id;
    // User exists -> update bypass password so client can sign in
    await supaAdmin.auth.admin.updateUserById(uid, { password: BYPASS_PASSWORD });
  } else {
    // Create new auth user
    // NOTE: This triggers public.handle_new_user() which inserts into public.users
    const { data: created, error } = await supaAdmin.auth.admin.createUser({
      email,
      password: BYPASS_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error) throw error;
    uid = created.user.id;
    
    // Wait a moment for the trigger to finish inserting into public.users
    await new Promise(r => setTimeout(r, 500));
  }

  // Update public.users (in case we got fresh data from ETHOL)
  await supaAdmin.from('users').update({ full_name: fullName }).eq('id', uid);

  // Upsert role-specific row
  if (role === 'mahasiswa') {
    await supaAdmin.from('mahasiswa').upsert({
      user_id: uid, nrp, nama_lengkap: fullName,
      kelas: 'Belum ditentukan', prodi,
      angkatan: new Date().getFullYear(),
    }, { onConflict: 'user_id' });
  } else {
    await supaAdmin.from('dosen_wali').upsert({
      user_id: uid, nip: nrp, nama_lengkap: fullName,
      prodi,
    }, { onConflict: 'user_id' });
  }

  return { email, role, isNew: !existing };
}

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

          console.log(`[CAS] Validating and Scraping ${netId} ...`);

          // 1. Validate & Scrape
          const cas = await validateCASAndScrape(netId, password);
          if (!cas.success) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ success: false, message: cas.message || 'Kredensial salah.' }));
          }

          console.log(`[CAS] ${netId} validated. Syncing to Supabase...`);

          // 2. Sync user into Supabase
          const supaUrl = env.VITE_SUPABASE_URL;
          const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
          if (!supaUrl || !serviceKey) {
            throw new Error('Supabase Config Missing');
          }

          const supaAdmin = createClient(supaUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const userInfo = await ensureUser(supaAdmin, netId, cas.scrapedData);
          console.log(`[CAS] Synced ${userInfo.email}`);

          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            email: userInfo.email,
            role: userInfo.role,
          }));
        } catch (err) {
          console.error('[CAS] Error:', err.message);
          res.statusCode = 500;
          const msg = err.response ? `HTTP ${err.response.status} from ${err.response.config.url}` : err.message;
          res.end(JSON.stringify({ success: false, message: msg }));
        }
      });
    },
  };
}

export { BYPASS_PASSWORD };
