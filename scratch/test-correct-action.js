const axios = require('axios');
const cheerio = require('cheerio');

const CAS_BASE = 'https://login.pens.ac.id';
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

async function testCorrectFormActionPost() {
  console.log('=== TEST POSTING TO EXACT FORM ACTION ===');
  let cookies = {};
  const getUrl = `https://login.pens.ac.id/cas/login?service=${encodeURIComponent(ETHOL_SERVICE)}`;
  
  const getRes = await axios.get(getUrl, { headers: HEADERS });
  Object.assign(cookies, parseCookies(getRes.headers['set-cookie']));
  
  const $ = cheerio.load(getRes.data);
  const action = $('form').attr('action');
  console.log('Action attribute found:', action);
  
  const formData = {};
  $('form input').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).val();
    if (name) formData[name] = value ?? '';
  });

  formData['username'] = 'syahrulardi';
  formData['password'] = 'wrong_pass_to_test';
  formData['warn'] = 'false';
  formData['_eventId'] = 'submit';

  // Construct absolute action URL
  const postUrl = action.startsWith('http') ? action : `${CAS_BASE}${action}`;
  console.log('Posting to URL:', postUrl);

  const postRes = await axios.post(
    postUrl,
    new URLSearchParams(formData).toString(),
    {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': joinCookies(cookies),
        'Referer': getUrl,
        'Origin': 'https://login.pens.ac.id',
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 500,
    }
  );
  
  console.log('POST Response Status:', postRes.status);
  const $b = cheerio.load(postRes.data);
  const errorMsg = $b('.errors, #status, .status, .alert-danger').text().trim();
  console.log('Error Message in HTML:', errorMsg);
  
  $b('div, span, p').each((_, el) => {
    const txt = $b(el).text().trim();
    if (txt.includes('determined') || txt.includes('authentic') || txt.includes('salah') || txt.includes('Password') || txt.includes('NetID')) {
      console.log('FOUND TEXT:', txt);
    }
  });
}

testCorrectFormActionPost();
