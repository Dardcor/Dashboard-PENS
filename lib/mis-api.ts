import axios from 'axios';
import * as cheerio from 'cheerio';

const MIS_BASE_URL = 'https://online.mis.pens.ac.id';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

// Assuming cookieStr contains PHPSESSID or other auth cookies needed for MIS
export async function getMisHtml(path: string, cookieStr: string) {
  try {
    const res = await axios.get(`${MIS_BASE_URL}${path}`, {
      headers: { ...HEADERS, Cookie: cookieStr },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    return res.data as string;
  } catch (error: any) {
    console.error(`[MIS-API] Error fetching ${path}: ${error.message}`);
    return null;
  }
}

export function parseBiodata(html: string) {
  const $ = cheerio.load(html);
  const data: any = {};
  
  // This is a generic parser for MIS biodata table
  $('table tr').each((i, el) => {
    const key = $(el).find('td').eq(0).text().trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const val = $(el).find('td').eq(2).text().trim();
    if (key && val) {
      data[key] = val;
    }
  });

  return data;
}

export function parseKhs(html: string) {
  const $ = cheerio.load(html);
  const mataKuliah: any[] = [];
  const ipkData: any = {};
  
  // Find table containing grades (typically has columns No, Kode, Matakuliah, SKS, Nilai)
  $('table').each((i, table) => {
    const isKhsTable = $(table).find('th, td').text().toLowerCase().includes('nilai');
    if (isKhsTable) {
      $(table).find('tr').each((j, tr) => {
        if (j > 0) { // skip header
          const cols = $(tr).find('td');
          if (cols.length >= 5) {
            mataKuliah.push({
              kode: $(cols[1]).text().trim(),
              nama: $(cols[2]).text().trim(),
              sks: parseInt($(cols[3]).text().trim()) || 0,
              nilai_huruf: $(cols[4]).text().trim(),
            });
          }
        }
      });
    }
  });

  // Extract IPK and IPS
  const text = $('body').text();
  const ipkMatch = text.match(/IPK\s*:\s*([0-9.]+)/i);
  const ipsMatch = text.match(/IPS\s*:\s*([0-9.]+)/i);
  
  if (ipkMatch) ipkData.ipk = parseFloat(ipkMatch[1]);
  if (ipsMatch) ipkData.ips = parseFloat(ipsMatch[1]);

  return { mataKuliah, ipkData };
}
