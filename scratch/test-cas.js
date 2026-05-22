const axios = require('axios');
const cheerio = require('cheerio');

const CAS_BASE = 'https://login.pens.ac.id/cas';
const ETHOL_SERVICE = 'https://ethol.pens.ac.id/login/index.php';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

function parseCookies(raw = []) {
  const out = {};
  for (const h of raw) {
    const p = h.split(';')[0].trim();
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  }
  return out;
}

const joinCookies = (c) => Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; ');

async function testFormLogin() {
  console.log('=== TESTING CAS FORM LOGIN FLOW ===');
  
  // Step 1: GET login page with maxRedirects: 0 to see if it redirects
  console.log('Step 1: GET CAS Login page...');
  let cookies = {};
  let url = `${CAS_BASE}/login?service=${encodeURIComponent(ETHOL_SERVICE)}`;
  let res;
  
  try {
    res = await axios.get(url, {
      headers: HEADERS,
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
    });
  } catch (err) {
    if (err.response && err.response.status === 302) {
      console.log('GET returned 302 Redirect to:', err.response.headers.location);
      const newC = parseCookies(err.response.headers['set-cookie']);
      Object.assign(cookies, newC);
      url = err.response.headers.location;
      res = await axios.get(url, {
        headers: { ...HEADERS, Cookie: joinCookies(cookies) },
        maxRedirects: 5,
      });
    } else {
      console.error('GET failed:', err.message);
      return;
    }
  }

  const newC = parseCookies(res.headers['set-cookie']);
  Object.assign(cookies, newC);
  
  console.log('Cookies after GET:', cookies);
  
  const $ = cheerio.load(res.data);
  const formData = {};
  $('form input').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).val();
    if (name) formData[name] = value ?? '';
  });

  formData['username'] = 'syahrulardi';
  formData['password'] = 'dummy_wrong_password_12345';
  formData['warn'] = 'false';
  formData['_eventId'] = 'submit';
  
  console.log('Form data to POST:', formData);

  // Step 2: POST credentials
  console.log('Step 2: POSTing to CAS...');
  try {
    const postRes = await axios.post(
      `${CAS_BASE}/login?service=${encodeURIComponent(ETHOL_SERVICE)}`,
      new URLSearchParams(formData).toString(),
      {
        headers: {
          ...HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': joinCookies(cookies),
          'Referer': url,
          'Origin': 'https://login.pens.ac.id',
        },
        maxRedirects: 0,
        validateStatus: (s) => s < 400,
      }
    );
    console.log('POST Status:', postRes.status);
    console.log('POST Redirect Location:', postRes.headers.location);
  } catch (err) {
    if (err.response) {
      console.log('POST status:', err.response.status);
      console.log('POST headers:', err.response.headers);
      const body = err.response.data;
      const $b = cheerio.load(body);
      const errorMsg = $b('.alert-danger, .errors, #status, [class*="error"]').text().trim();
      console.log('Error message in HTML:', errorMsg);
    } else {
      console.error('POST failed:', err.message);
    }
  }
}

testFormLogin();
