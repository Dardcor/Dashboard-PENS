import axios from 'axios';
import * as cheerio from 'cheerio';

const ETHOL_API_BASE = 'https://ethol.pens.ac.id/api';
const ETHOL_BASE = 'https://ethol.pens.ac.id';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

export async function getEtholJwtToken(cookieStr: string): Promise<string | null> {
  // 1. Check if the JWT is already in the cookie string
  const directMatch = cookieStr.match(/(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/);
  if (directMatch) return directMatch[1];

  const pages = [
    '/mahasiswa/beranda',
    '/my/',
    '/',
    '/cas/',
    '/mahasiswa/matakuliah',
  ];

  for (const page of pages) {
    try {
      const res = await axios.get(`${ETHOL_BASE}${page}`, {
        headers: { ...HEADERS, Cookie: cookieStr },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

      // Pattern 1: Full JWT in body
      const jwtMatch = body.match(/(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/);
      if (jwtMatch) return jwtMatch[1];

      // Pattern 2: JWT in script tag variable
      const scriptMatch = body.match(/["'](eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})["']/);
      if (scriptMatch) return scriptMatch[1];

      // Pattern 3: token variable assignment
      const tokenVarMatch = body.match(/token\s*[=:]\s*["']([^"']+)["']/);
      if (tokenVarMatch && tokenVarMatch[1].startsWith('eyJ')) return tokenVarMatch[1];

      // Pattern 4: Check meta tags
      const $ = cheerio.load(body);
      const metaToken = $('meta[name="api-token"], meta[name="token"], meta[name="jwt"]').attr('content');
      if (metaToken && metaToken.startsWith('eyJ')) return metaToken;

      // Pattern 5: Check script tag with __INITIAL_STATE__ or __NEXT_DATA__ or similar
      $('script').each((_, el) => {
        const text = $(el).html() || '';
        const initMatch = text.match(/["']?token["']?\s*[:=]\s*["'](eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})["']/);
        if (initMatch && !jwtMatch) {
          // We need to return early from the outer function
        }
      });

    } catch (e) {
      console.log(`[JWT-EXTRACT] ${page}: ${(e as Error).message}`);
    }
  }

  // 3. Try dedicated token endpoint if it exists
  try {
    const res = await axios.get(`${ETHOL_API_BASE}/auth/token`, {
      headers: { ...HEADERS, Cookie: cookieStr },
      timeout: 10000,
      validateStatus: (s) => s < 500,
    });
    if (res.status === 200 && res.data?.token) {
      return res.data.token;
    }
  } catch (e) {
    // Endpoint likely doesn't exist, ignore
  }

  // 4. Try to get token via Moodle sesskey approach
  try {
    const res = await axios.get(`${ETHOL_BASE}/my/`, {
      headers: { ...HEADERS, Cookie: cookieStr },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    const $ = cheerio.load(res.data as string);

    // Extract sesskey from page
    const sesskey = $('input[name="sesskey"]').val() as string ||
      (res.data as string).match(/sesskey\s*[:=]\s*["']([^"']+)["']/)?.[1] || '';

    if (sesskey) {
      // Try Moodle's AJAX service to get user data
      const ajaxRes = await axios.post(`${ETHOL_BASE}/lib/ajax/service.php`, [{
        index: 0,
        methodname: 'core_auth_get_token_for_service',
        args: { servicename: 'ethol_api' }
      }], {
        headers: {
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 10000,
      });
      if (ajaxRes.data?.[0]?.data?.token) {
        return ajaxRes.data[0].data.token;
      }
    }
  } catch (e) {
    console.log(`[JWT-EXTRACT] Moodle AJAX: ${(e as Error).message}`);
  }

  return null;
}

// ─── API Requests ───

function getHeaders(token: string) {
  return {
    'User-Agent': UA,
    'token': token,
    'Accept': 'application/json',
  };
}

export async function getCourses(token: string, tahun?: number, semester?: number) {
  const params: Record<string, any> = {};
  if (tahun) params.tahun = tahun;
  if (semester) params.semester = semester;

  const res = await axios.get(`${ETHOL_API_BASE}/kuliah`, {
    headers: getHeaders(token),
    params,
  });
  return res.data;
}

export async function getOnlineSchedule(token: string, tahun?: number, semester?: number) {
  const params: Record<string, any> = {};
  if (tahun) params.tahun = tahun;
  if (semester) params.semester = semester;

  const res = await axios.get(`${ETHOL_API_BASE}/jadwal/jadwal-online`, {
    headers: getHeaders(token),
    params,
  });
  return res.data;
}

export async function getAssignments(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/tugas`, {
    headers: getHeaders(token),
    params: { kuliah, jenisSchema },
  });
  return res.data;
}

export async function getLatestAssignments(token: string, tahun?: number, semester?: number) {
  const data: Record<string, any> = {};
  if (tahun) data.tahun = tahun;
  if (semester) data.semester = semester;

  const res = await axios.post(`${ETHOL_API_BASE}/tugas/tugas-terakhir-mahasiswa`, data, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function getStudentWork(token: string, idTugas: number) {
  const res = await axios.get(`${ETHOL_API_BASE}/tugas/pekerjaan-mahasiswa`, {
    headers: getHeaders(token),
    params: { id_tugas: idTugas },
  });
  return res.data;
}

export async function getStudentSubmission(token: string, idTugas: number) {
  const res = await axios.get(`${ETHOL_API_BASE}/tugas/jawaban-mahasiswa-by-id`, {
    headers: getHeaders(token),
    params: { id_tugas: idTugas },
  });
  return res.data;
}

export async function getAttendanceHistory(token: string, kuliah: number, nomor: string, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/presensi/riwayat`, {
    headers: getHeaders(token),
    params: { kuliah, nomor, jenis_schema: jenisSchema },
  });
  return res.data;
}

export async function getLatestAttendance(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/presensi/terakhir-kuliah`, {
    headers: getHeaders(token),
    params: { kuliah, jenis_schema: jenisSchema },
  });
  return res.data;
}

export async function getActiveAttendance(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/presensi/aktif-kuliah`, {
    headers: getHeaders(token),
    params: { kuliah, jenis_schema: jenisSchema },
  });
  return res.data;
}

export async function submitAttendance(token: string, payload: {
  kuliah: number;
  mahasiswa: number;
  jenisSchema: number;
  kuliahAsal: number;
  key: string;
}) {
  const res = await axios.post(`${ETHOL_API_BASE}/presensi/mahasiswa`, {
    kuliah: payload.kuliah,
    mahasiswa: payload.mahasiswa,
    jenis_schema: payload.jenisSchema,
    kuliah_asal: payload.kuliahAsal,
    key: payload.key,
  }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function getLatestAnnouncements(token: string, kuliah?: number, jenisSchema: number = 4) {
  const params: Record<string, any> = { jenis_schema: jenisSchema };
  if (kuliah) params.kuliah = kuliah;
  const res = await axios.get(`${ETHOL_API_BASE}/pengumuman/terbaru`, {
    headers: getHeaders(token),
    params,
  });
  return res.data;
}

export async function getAnnouncements(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/pengumuman`, {
    headers: getHeaders(token),
    params: { kuliah, jenis_schema: jenisSchema },
  });
  return res.data;
}

export async function getMaterials(token: string, matakuliah: string, dosen: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/materi`, {
    headers: getHeaders(token),
    params: { matakuliah, dosen },
  });
  let data = res.data;
  if (data && typeof data === 'object' && 'materials' in data) {
    data = data.materials;
  }
  return Array.isArray(data) ? data : [];
}

export async function getVideos(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/video`, {
    headers: getHeaders(token),
    params: { kuliah, jenis_schema: jenisSchema },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getQuizzes(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/quiz`, {
    headers: getHeaders(token),
    params: { kuliah, jenisSchema },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getCourseParticipants(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/kuliah/peserta-kuliah`, {
    headers: getHeaders(token),
    params: { kuliah, jenis_schema: jenisSchema },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getLecturerEmail(token: string, nomor: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/pegawai/dosenemailpens`, {
    headers: getHeaders(token),
    params: { nomor },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getConferenceInfo(token: string, dosenNomor: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/conference-lainnya`, {
    headers: getHeaders(token),
    params: { dosen: dosenNomor },
  });
  return res.data;
}

// Forum
export async function getForumPosts(token: string, kuliah: number, jenisSchema: number = 4) {
  const res = await axios.get(`${ETHOL_API_BASE}/forum`, {
    headers: getHeaders(token),
    params: { kuliah, jenisSchema },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createForumPost(token: string, kuliah: number, jenisSchema: number, narasi: string) {
  const res = await axios.post(`${ETHOL_API_BASE}/forum`, {
    narasi,
    lampiran: [],
    kuliah,
    jenisSchema,
    tipeAkses: 'mahasiswa',
  }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function addForumComment(token: string, idForum: number, narasi: string) {
  const res = await axios.post(`${ETHOL_API_BASE}/forum/komentar`, {
    idForum,
    narasi,
    tipeAkses: 'mahasiswa',
  }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function deleteForumPost(token: string, id: number) {
  const res = await axios.delete(`${ETHOL_API_BASE}/forum/${id}`, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function deleteForumComment(token: string, id: number) {
  const res = await axios.delete(`${ETHOL_API_BASE}/forum/komentar/${id}`, {
    headers: getHeaders(token),
  });
  return res.data;
}

// ─── Notifications ─────────────────────────────────────────────────────────────
export async function getNotifications(token: string, filterNotif: string = 'SEMUA') {
  const res = await axios.get(`${ETHOL_API_BASE}/notifikasi/mahasiswa`, {
    headers: getHeaders(token),
    params: { filterNotif },
  });
  return res.data;
}

export async function getUnreadNotificationCount(token: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/notifikasi/mahasiswa-belum-baca`, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function markNotificationRead(token: string, idNotif: number) {
  const res = await axios.put(`${ETHOL_API_BASE}/notifikasi/mahasiswa-baca-notif`, { idNotif }, {
    headers: getHeaders(token),
  });
  return res.data;
}

// ─── Exams ─────────────────────────────────────────────────────────────────────
export async function getExams(token: string, tahun?: number, semester?: number, jenis?: string) {
  const params: Record<string, any> = {};
  if (tahun) params.tahun = tahun;
  if (semester) params.semester = semester;
  if (jenis) params.jenis = jenis;

  const res = await axios.get(`${ETHOL_API_BASE}/ujian/daftar-ujian`, {
    headers: getHeaders(token),
    params,
  });
  return res.data;
}

export async function submitExam(token: string, nomorUjian: number, file: File) {
  const formData = new FormData();
  formData.append('nomor', nomorUjian.toString());
  formData.append('file', file);

  const res = await axios.post(`${ETHOL_API_BASE}/ujian/submit`, formData, {
    headers: {
      ...getHeaders(token),
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getExamAnswers(token: string, nomor: number) {
  const res = await axios.get(`${ETHOL_API_BASE}/ujian/jawaban`, {
    headers: getHeaders(token),
    params: { nomor },
  });
  return res.data;
}

// ─── Support Tickets ───────────────────────────────────────────────────────────
export async function getSupportTickets(token: string, hakAkses: string = 'mahasiswa') {
  const res = await axios.get(`${ETHOL_API_BASE}/support`, {
    headers: getHeaders(token),
    params: { hakAkses },
  });
  return res.data;
}

export async function createSupportTicket(token: string, data: { judul: string, keterangan: string, hakAkses: string }) {
  const res = await axios.post(`${ETHOL_API_BASE}/support`, {
    judul: data.judul,
    keterangan: data.keterangan,
    hakAkses: data.hakAkses,
    lampiran: [],
  }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function deleteSupportTicket(token: string, nomor: number) {
  const res = await axios.delete(`${ETHOL_API_BASE}/support/${nomor}`, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function getSupportTicketDetail(token: string, nomor: number) {
  const res = await axios.get(`${ETHOL_API_BASE}/support/nama`, {
    headers: getHeaders(token),
    params: { nomor },
  });
  return res.data;
}

export async function getSupportTicketReplies(token: string, nomor: number) {
  const res = await axios.get(`${ETHOL_API_BASE}/support/balas`, {
    headers: getHeaders(token),
    params: { nomor },
  });
  return res.data;
}

export async function replySupportTicket(token: string, nomor: number, balasan: string) {
  const res = await axios.post(`${ETHOL_API_BASE}/support/balas`, {
    nomor,
    balasan,
  }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function resolveSupportTicket(token: string, nomor: number) {
  const res = await axios.put(`${ETHOL_API_BASE}/support/status`, { nomor }, {
    headers: getHeaders(token),
  });
  return res.data;
}

// ─── Quiz Detail ───────────────────────────────────────────────────────────────
export async function getQuizDetail(token: string, kuisId: number, mahasiswa: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/quiz/show`, {
    headers: getHeaders(token),
    params: { kuis_id: kuisId, mahasiswa },
  });
  return res.data;
}

export async function getQuizTime(token: string, kuisId: number, mahasiswa: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/quiz/waktu`, {
    headers: getHeaders(token),
    params: { kuis_id: kuisId, mahasiswa },
  });
  return res.data;
}

export async function submitQuizAnswer(token: string, kuisHasilId: number, kuisSoalId: number, jawabanDipilih: string) {
  const res = await axios.post(`${ETHOL_API_BASE}/quiz/answer`, {
    kuis_hasil_id: kuisHasilId,
    kuis_soal_id: kuisSoalId,
    jawaban_dipilih: jawabanDipilih,
  }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function finishQuiz(token: string, kuisHasilId: number) {
  const res = await axios.post(`${ETHOL_API_BASE}/quiz/finish`, { kuis_hasil_id: kuisHasilId }, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function reviewQuiz(token: string, kuisHasilId: number) {
  const res = await axios.get(`${ETHOL_API_BASE}/quiz/review`, {
    headers: getHeaders(token),
    params: { kuis_hasil_id: kuisHasilId },
  });
  return res.data;
}

// ─── MIS (Master Data) ────────────────────────────────────────────────────────
export async function getJurusan(token: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/mis/jurusan`, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function getProgram(token: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/mis/program`, {
    headers: getHeaders(token),
  });
  return res.data;
}

export async function getTahun(token: string) {
  const res = await axios.get(`${ETHOL_API_BASE}/mis/tahun`, {
    headers: getHeaders(token),
  });
  return res.data;
}

// ─── Moodle AJAX Service (fallback when JWT not available) ─────────────────────
export async function getSesskey(cookieStr: string): Promise<string | null> {
  try {
    const res = await axios.get(`${ETHOL_BASE}/my/`, {
      headers: { ...HEADERS, Cookie: cookieStr },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    const $ = cheerio.load(res.data as string);
    const sesskey = $('input[name="sesskey"]').val() as string ||
      (res.data as string).match(/sesskey\s*[:=]\s*["']([^"']+)["']/)?.[1] || '';
    return sesskey || null;
  } catch {
    return null;
  }
}

export async function callMoodleAjax<T = any>(
  cookieStr: string,
  sesskey: string,
  method: string,
  args: Record<string, any>
): Promise<T | null> {
  try {
    const res = await axios.post(`${ETHOL_BASE}/lib/ajax/service.php?sesskey=${sesskey}`,
      [{ index: 0, methodname: method, args }],
      {
        headers: {
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    );
    if (res.data?.[0]?.error) {
      console.warn(`[MOODLE-AJAX] ${method}: ${res.data[0].error}`);
      return null;
    }
    return res.data?.[0]?.data ?? null;
  } catch (e) {
    console.warn(`[MOODLE-AJAX] ${method}: ${(e as Error).message}`);
    return null;
  }
}
