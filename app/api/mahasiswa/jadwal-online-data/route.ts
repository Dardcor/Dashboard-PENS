import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supaAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import axios from 'axios';
import * as etholApi from '../../../../lib/ethol-api';

async function resolveMahasiswaId(userId: string, userEmail?: string | null): Promise<string | null> {
  // 1. Direct match
  { const { data } = await supaAdmin.from('mahasiswa').select('id, prodi').eq('user_id', userId).maybeSingle();
    if (data) return data.id; }

  // 2. Email-based lookup via users table
  if (userEmail) {
    const { data: userRow } = await supaAdmin.from('users').select('id').eq('email', userEmail).maybeSingle();
    if (userRow) {
      const { data: mhs } = await supaAdmin.from('mahasiswa').select('id').eq('user_id', userRow.id).maybeSingle();
      if (mhs) return mhs.id;
    }
  }

  // 3. Last resort
  const { data: any1 } = await supaAdmin.from('mahasiswa').select('id').limit(1).maybeSingle();
  return any1?.id || null;
}

// ─── Helper to safely get or update mata_kuliah ───
async function updateMataKuliahJadwal(nama: string, hari: string, jam: string, ruang: string, dosen: string) {
  // Try exact name match first, then fallback to case-insensitive
  let ex: any = null;
  
  const { data: exact, error: err1 } = await supaAdmin
    .from('mata_kuliah')
    .select('id, dosen, hari, jam, ruang')
    .eq('nama', nama)
    .limit(1);
  
  if (exact && exact.length > 0) {
    ex = exact[0];
  } else {
    // Fallback: case-insensitive exact match
    const { data: ilike, error: err2 } = await supaAdmin
      .from('mata_kuliah')
      .select('id, dosen, hari, jam, ruang')
      .ilike('nama', nama)
      .limit(1);
    if (ilike && ilike.length > 0) ex = ilike[0];
  }

  if (!ex) {
    console.log(`  [SKIP] Course "${nama}" not found in DB, skipping update.`);
    return;
  }

  // Only update if there are meaningful changes
  const safeHari = hari && hari !== 'Sesuai Jadwal' ? hari : ex.hari;
  const safeJam = jam && jam !== 'Sesuai Jadwal' ? jam : ex.jam;
  const safeRuang = ruang && ruang !== 'Kelas Offline' ? ruang : ex.ruang;
  const safeDosen = dosen && dosen !== 'Dosen Pengampu' ? dosen : ex.dosen;

  const { error: updateErr } = await supaAdmin.from('mata_kuliah').update({
    hari: safeHari,
    jam: safeJam,
    ruang: safeRuang,
    dosen: safeDosen
  }).eq('id', ex.id);

  if (updateErr) {
    console.error(`  [ERROR] Failed to update "${nama}":`, updateErr.message);
  } else {
    console.log(`  [OK] Updated "${nama}" → hari=${safeHari}, jam=${safeJam}`);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const userEmail = searchParams.get('email');

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  try {
    const mhsId = await resolveMahasiswaId(userId, userEmail);
    if (!mhsId) return NextResponse.json({ jadwal: {} });

    // ─── 1. DYNAMIC SCRAPING FROM ETHOL ───
    // Normalize ETHOL hari names (e.g. "Jum'at" → "Jumat")
    function normalizeHari(h: string | null): string {
      if (!h) return 'Sesuai Jadwal';
      const map: Record<string, string> = {
        "senin": "Senin", "selasa": "Selasa", "rabu": "Rabu",
        "kamis": "Kamis", "jumat": "Jumat", "jum'at": "Jumat",
        "sabtu": "Sabtu", "minggu": "Minggu",
      };
      return map[h.toLowerCase().trim()] || h;
    }

    try {
      const { data: session } = await supaAdmin.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', userId).maybeSingle();
      
      if (session && session.ethol_cookie) {
        const etholJwt = await etholApi.getEtholJwtToken(session.ethol_cookie);
        
        if (etholJwt) {
          console.log('[jadwal-online-data] JWT token found, scraping from ETHOL...');
          
          const ETHOL_BASE = 'https://ethol.pens.ac.id';
          const res = await axios.get(`${ETHOL_BASE}/api/jadwal/jadwal-online`, {
            headers: { 'token': etholJwt, 'Cookie': session.ethol_cookie }, 
            validateStatus: (s) => s < 500, 
            timeout: 15000
          });

          if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
            console.log(`[jadwal-online-data] Scraped ${res.data.length} items from ETHOL. Saving to Supabase...`);
            
            // ─── 2. SAVE EACH SCRAPED ITEM TO SUPABASE ───
            for (const j of res.data) {
              // ETHOL fields: matakuliah, hari, jam_awal, jam_akhir, dosen, ruang, gelar_dpn, gelar_blk
              const matkul = (j.matakuliah || '').trim();
              if (!matkul) continue;

              const hari = normalizeHari(j.hari);
              
              // Build jam from jam_awal + jam_akhir (ETHOL does NOT have a "jam" field)
              const jamAwal = (j.jam_awal || '').trim();
              const jamAkhir = (j.jam_akhir || '').trim();
              const jam = jamAwal && jamAkhir ? `${jamAwal} - ${jamAkhir}` : 'Sesuai Jadwal';
              
              const ruang = (j.ruang || '').trim() || 'Kelas Offline';
              
              // Build full dosen name with gelar
              const dosenName = (j.dosen || '').trim();
              const gelarDpn = (j.gelar_dpn || '').trim();
              const gelarBlk = (j.gelar_blk || '').trim();
              const dosenFull = [gelarDpn, dosenName, gelarBlk].filter(Boolean).join(' ').trim() || 'Dosen Pengampu';

              console.log(`  → ${matkul}: ${hari}, ${jam}, ruang=${ruang}, dosen=${dosenFull}`);
              await updateMataKuliahJadwal(matkul, hari, jam, ruang, dosenFull);
            }
            console.log('[jadwal-online-data] All items saved to Supabase successfully.');
          } else {
            console.log('[jadwal-online-data] ETHOL API returned empty/invalid data. status=', res.status, 'dataLength=', res.data?.length);
          }
        } else {
          console.log('[jadwal-online-data] Could not extract JWT from cookie. Skipping scrape.');
        }
      } else {
        console.log('[jadwal-online-data] No ethol session found for user. Skipping scrape.');
      }
    } catch (scrapeErr: any) {
      console.error('[jadwal-online-data] Scraping error (serving from DB):', scrapeErr.message);
    }


    // ─── 3. FETCH AND SERVE DATA FROM SUPABASE ───
    const { data: rows, error } = await supaAdmin
      .from('kehadiran')
      .select('mata_kuliah:mata_kuliah_id(id, nama, kode, sks, dosen, hari, jam, ruang)')
      .eq('mahasiswa_id', mhsId);

    if (error) {
      console.error('[jadwal-online-data]', error.message);
      return NextResponse.json({ jadwal: {} });
    }

    // De-duplicate by course name
    const uniqueByName = new Map<string, any>();
    for (const k of (rows || [])) {
      const mk = k.mata_kuliah as any;
      if (!mk || !mk.nama) continue;
      if (uniqueByName.has(mk.nama)) continue;
      uniqueByName.set(mk.nama, mk);
    }

    // Build schedule grouped by day
    const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Belum Terjadwal'];
    const jadwal: Record<string, any[]> = {};
    DAYS.forEach(d => { jadwal[d] = []; });

    for (const [nama, mk] of uniqueByName) {
      let hari = mk.hari;
      
      // Normalize hari in case DB still has old format like "Jum'at"
      if (hari && hari.toLowerCase().includes("jum")) hari = 'Jumat';
      
      if (!hari || hari === 'Sesuai Jadwal' || !DAYS.includes(hari)) {
        hari = 'Belum Terjadwal';
      }

      jadwal[hari].push({
        nama: mk.nama,
        dosen: mk.dosen || 'Dosen Pengampu',
        sks: mk.sks || 3,
        jam: mk.jam || 'Sesuai Jadwal',
        ruang: mk.ruang || 'Kelas Virtual / Offline',
        kode: mk.kode || '',
      });
    }

    // Sort each day by time
    for (const day of DAYS) {
      jadwal[day].sort((a: any, b: any) => {
        const ta = a.jam.split(' ')[0] || '00:00';
        const tb = b.jam.split(' ')[0] || '00:00';
        return ta.localeCompare(tb);
      });
    }

    return NextResponse.json({ 
      jadwal, 
      totalCourses: uniqueByName.size,
      scheduledCourses: Object.entries(jadwal).reduce((sum, [day, arr]) => day !== 'Belum Terjadwal' ? sum + arr.length : sum, 0)
    });
  } catch (error: any) {
    console.error('[jadwal-online-data] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
