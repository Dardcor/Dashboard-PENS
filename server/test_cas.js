import axios from 'axios';
import * as cheerio from 'cheerio';
import querystring from 'node:querystring';

async function test() {
  const serviceUrl = 'https://ethol.pens.ac.id/cas/';
  const loginPageUrl = `https://login.pens.ac.id/cas/login?service=${encodeURIComponent(serviceUrl)}`;
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const initRes = await axios.get(loginPageUrl, { headers: { 'User-Agent': ua } });
    const casCookies = initRes.headers['set-cookie'];
    console.log("Cookies:", casCookies);
    const $ = cheerio.load(initRes.data);
    const lt = $('input[name="lt"]').val();
    const execution = $('input[name="execution"]').val();
    const eventId = $('input[name="_eventId"]').val() || 'submit';
    console.log("Tokens:", { lt, execution, eventId });

    // Try dummy credentials to see if it gives 200 or 500
    const formData = querystring.stringify({ username: 'syahrulardi@it.student.pens.ac.id', password: 'wrongpassword', lt, execution, _eventId: eventId });
    
    const postRes = await axios.post(loginPageUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': casCookies.map(c => c.split(';')[0]).join('; '),
        'User-Agent': ua,
        'Referer': loginPageUrl,
      },
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s <= 302,
    });
    console.log("Post status:", postRes.status);
    console.log("Post headers:", postRes.headers);

  } catch (e) {
    console.error("Error:", e.message);
    if (e.response) {
      console.error("Response data:", e.response.data);
    }
  }
}

test();
