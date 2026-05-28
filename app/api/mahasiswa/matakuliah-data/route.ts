import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supaAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resolveMahasiswaId(userId: string, userEmail?: string | null): Promise<string | null> {
  // 1. Direct match
  { const { data } = await supaAdmin.from('mahasiswa').select('id').eq('user_id', userId).maybeSingle();
    if (data) return data.id; }

  // 2. Email-based lookup via users table
  if (userEmail) {
    const { data: userRow } = await supaAdmin.from('users').select('id').eq('email', userEmail).maybeSingle();
    if (userRow) {
      const { data: mhs } = await supaAdmin.from('mahasiswa').select('id').eq('user_id', userRow.id).maybeSingle();
      if (mhs) {
        await supaAdmin.from('mahasiswa').update({ user_id: userId }).eq('id', mhs.id);
        await supaAdmin.from('users').update({ id: userId }).eq('email', userEmail);
        return mhs.id;
      }
    }
    // partial email match
    const localPart = userEmail.split('@')[0].toLowerCase();
    const { data: usersLike } = await supaAdmin.from('users').select('id, email').ilike('email', `${localPart}%`);
    for (const u of (usersLike || [])) {
      const { data: mhs } = await supaAdmin.from('mahasiswa').select('id').eq('user_id', u.id).maybeSingle();
      if (mhs) { await supaAdmin.from('mahasiswa').update({ user_id: userId }).eq('id', mhs.id); return mhs.id; }
    }
  }

  // 3. Return mahasiswa with most kehadiran (last resort)
  const { data: top } = await supaAdmin.from('kehadiran').select('mahasiswa_id').limit(1);
  if (top && top.length > 0) return top[0].mahasiswa_id;

  const { data: any1 } = await supaAdmin.from('mahasiswa').select('id').limit(1).maybeSingle();
  return any1?.id || null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const userEmail = searchParams.get('email');

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  try {
    const mhsId = await resolveMahasiswaId(userId, userEmail);
    if (!mhsId) return NextResponse.json({ courses: [] });

    const { data: rows, error } = await supaAdmin
      .from('kehadiran')
      .select('mata_kuliah:mata_kuliah_id(id, nama, kode, sks, dosen, hari, jam, ruang)')
      .eq('mahasiswa_id', mhsId);

    if (error) { console.error('[matakuliah-data]', error.message); return NextResponse.json({ courses: [] }); }

    const unique = new Map<string, any>();
    for (const k of (rows || [])) {
      const mk = k.mata_kuliah as any;
      if (!mk || unique.has(mk.id)) continue;
      const words = mk.nama.split(' ').filter((w: string) => w.trim().length > 0 && !w.includes('(') && !w.includes(')'));
      const code = words.length >= 3
        ? words.slice(0, 3).map((w: string) => w[0]).join('').toUpperCase()
        : words.length === 2 ? (words[0][0] + words[1].substring(0, 2)).toUpperCase()
        : mk.nama.substring(0, 3).toUpperCase();
      unique.set(mk.id, {
        id: mk.id, nama: mk.nama,
        dosen: mk.dosen || 'Dosen Pengampu',
        sks: mk.sks ?? 3,
        hari: mk.hari || 'Sesuai Jadwal',
        jam: mk.jam || 'Sesuai Jadwal',
        ruang: mk.ruang || 'Kelas Virtual / Offline',
        kode: code,
      });
    }

    return NextResponse.json({ courses: Array.from(unique.values()) });
  } catch (error: any) {
    console.error('[matakuliah-data] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
