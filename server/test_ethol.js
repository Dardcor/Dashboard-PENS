import axios from 'axios';
import * as cheerio from 'cheerio';
import querystring from 'node:querystring';

async function testComplete() {
  const serviceUrl = 'https://ethol.pens.ac.id/cas/';
  const loginPageUrl = `https://login.pens.ac.id/cas/login?service=${encodeURIComponent(serviceUrl)}`;
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const initRes = await axios.get(loginPageUrl, { headers: { 'User-Agent': ua } });
    const casCookies = initRes.headers['set-cookie'];
    const $ = cheerio.load(initRes.data);
    const lt = $('input[name="lt"]').val();
    const execution = $('input[name="execution"]').val();
    const eventId = $('input[name="_eventId"]').val() || 'submit';

    // Real test needs real credentials to test ETHOL scraping, but since I don't have them, 
    // I can just observe what happens if I do it with bad credentials. Wait, with bad credentials, 
    // postRes.status is 200, which means no redirect.
    // If user's screenshot happened with *correct* credentials, then they got redirected to ETHOL.
    console.log("If this were a successful login, what would ETHOL do?");

    // Just run a GET on ethol dashboard directly without auth
    const etholDashRes = await axios.get('https://ethol.pens.ac.id/dashboard', {
       headers: { 'User-Agent': ua }
    });
    console.log("Dashboard status:", etholDashRes.status);
    
  } catch (e) {
    console.error("Error message:", e.message);
    if (e.response) {
      console.error("Error status:", e.response.status);
    }
  }
}

testComplete();
