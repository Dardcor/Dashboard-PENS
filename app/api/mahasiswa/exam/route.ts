import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as etholApi from '../../../../lib/ethol-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tahun = searchParams.get('tahun') ? parseInt(searchParams.get('tahun')!) : undefined;
  const semester = searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : undefined;
  const jenis = searchParams.get('jenis') || undefined;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !svcKey) throw new Error('Supabase config missing');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await supa.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });

    const { data: session } = await supa.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', user.id).maybeSingle();
    if (!session?.ethol_cookie) return NextResponse.json({ success: false, message: 'Sesi ETHOL tidak ditemukan' }, { status: 400 });

    const jwt = await etholApi.getEtholJwtToken(session.ethol_cookie);
    if (!jwt) return NextResponse.json({ success: false, message: 'Gagal mengambil token ETHOL' }, { status: 401 });

    let exams = await etholApi.getExams(jwt, tahun, semester, jenis);

    if (!Array.isArray(exams)) {
      exams = [];
    }

    const uts = exams.filter((e: any) => e.jenis === 'UTS' || !jenis);
    const uas = exams.filter((e: any) => e.jenis === 'UAS' || !jenis);

    return NextResponse.json({
      success: true,
      data: { all: exams, uts, uas }
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
