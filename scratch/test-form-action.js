const axios = require('axios');
const cheerio = require('cheerio');

const CAS_BASE = 'https://login.pens.ac.id/cas';
const ETHOL_SERVICE = 'https://ethol.pens.ac.id/login/index.php';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

async function testSubmitSuccessSimulate() {
  console.log('=== Success Submission Simulation ===');
  // There is no redirect in Method A (REST) because we got 302 with Location: none or something?
  // Let us check what the TGT request returned: Status 302!
  // Wait, in the log provided by user:
  // [CAS-REST] Mencoba CAS REST API...
  // [CAS-REST] TGT response: 302
  // Why did CAS REST API return 302?
  // Ah! Because login.pens.ac.id/cas/v1/tickets does NOT exist, OR it redirects to /cas/login!
  // Yes, PENS CAS does NOT support CAS REST API protocol (which would be at /v1/tickets).
  // So it redirects to /login which is 302.
  
  // So only Method B (Form login) works.
  // But why does Form login return status: 200 with location: none for the user's correct credentials?
  // Because for the user, it STILL shows "The credentials you provided cannot be determined to be authentic." in the HTML response!
  // Wait! The user said: "padahal saya sudah sesuai memasukkan net id email dan password sesuai kampus saya"
  // But CAS said: "The credentials you provided cannot be determined to be authentic."
  
  // Let us check if there is an issue with the password!
  // Does the password contain special characters like &, +, %, etc.?
  // If yes, URLSearchParams(formData) or urlencoded string handles it properly, BUT wait:
  // How is the form data posted?
  // Let's check how we serialize the form data.
  // const postRes = await axios.post(
  //   `${CAS_BASE}/login?service=${encodeURIComponent(ETHOL_SERVICE)}`,
  //   new URLSearchParams(formData).toString(), ...
  
  // Yes, new URLSearchParams(formData).toString() is correct because it URL-encodes values.
  // BUT does PENS CAS login require a specific execution parameter?
  // Wait! Let us look at the form inputs scraped from PENS CAS page:
  // In the first script:
  // Form data to POST: {
  //   username: 'syahrulardi',
  //   password: '...',
  //   warn: 'false',
  //   lt: '_cABE3AF43-6903-CE79-8A03-161A58F59137_k1FE85D5E-439F-F0F2-F1FE-FAAA455661E5',
  //   _eventId: 'submit',
  //   submit: 'LOGIN',
  //   reset: 'CLEAR'
  // }
  // There is NO "execution" input in the form!
  // Let's check: Yes! `execution` is ✗! PENS CAS 3.4.2.1 does NOT use execution, it uses `lt` (Login Ticket) only!
  // That explains it perfectly.
  
  // But why did it say: "The credentials you provided cannot be determined to be authentic" for correct credentials?
  // 1. Is the password actually wrong? (e.g. maybe it needs a specific format, or it has special characters that get double encoded or stripped)
  // 2. Is there a CAPTCHA or cookies issue?
  // Let's verify if the cookies are properly maintained.
  // PENS CAS sends JSESSIONID cookie. We must send JSESSIONID back in the Cookie header.
  // We did send: 'Cookie': joinCookies(sessionCookies)
  
  // Wait! Let us check if there is any other hidden input we missed, or if the form action URL has a specific flow execution key!
  // Let us inspect the HTML of the form action itself.
  // Does the <form> tag have a specific action attribute with a webflow parameter?
  // Often, CAS forms have action="/cas/login;jsessionid=... ?service=..." or action="/cas/login?service=...&execution=..."
  // If the action contains a JSESSIONID or other params, posting directly to `${CAS_BASE}/login?service=...` without the form action path might fail or initiate a new session!
  
  console.log('Let us fetch the CAS login page and look at the form element itself.');
  const getRes = await axios.get(`${CAS_BASE}/login?service=${encodeURIComponent(ETHOL_SERVICE)}`, { headers: HEADERS });
  const $ = cheerio.load(getRes.data);
  const action = $('form').attr('action');
  console.log('Form Action Attribute:', action);
}

testSubmitSuccessSimulate();
