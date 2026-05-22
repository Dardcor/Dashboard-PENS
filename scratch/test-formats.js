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

async function testUsernameFormat(username) {
  console.log(`Testing username format: '${username}'`);
  let cookies = {};
  const getUrl = `https://login.pens.ac.id/cas/login?service=${encodeURIComponent(ETHOL_SERVICE)}`;
  
  const getRes = await axios.get(getUrl, { headers: HEADERS });
  Object.assign(cookies, parseCookies(getRes.headers['set-cookie']));
  
  const $ = cheerio.load(getRes.data);
  const action = $('form').attr('action');
  
  const formData = {};
  $('form input').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).val();
    // Do not include submit/reset button values to be safe
    if (name && name !== 'submit' && name !== 'reset') formData[name] = value ?? '';
  });

  formData['username'] = username;
  formData['password'] = 'test_wrong_password_123';
  formData['warn'] = 'false';
  formData['_eventId'] = 'submit';

  const postUrl = action.startsWith('http') ? action : `${CAS_BASE}${action}`;

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
  
  console.log(`Response status for '${username}':`, postRes.status);
  const $b = cheerio.load(postRes.data);
  const errorMsg = $b('.errors, #status, .status, .alert-danger, [id*="error"]').text().trim();
  console.log(`Error Message for '${username}':`, errorMsg.substring(0, 150));
}

async function run() {
  await testUsernameFormat('syahrulardi');
  await testUsernameFormat('syahrulardi@it.student.pens.ac.id');
}

run();
