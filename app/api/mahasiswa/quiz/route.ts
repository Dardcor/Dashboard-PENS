import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as etholApi from '../../../../lib/ethol-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const kuliahId = searchParams.get('kuliah');
  const action = searchParams.get('action') || 'list';

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !svcKey) throw new Error('Supabase config missing');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await supa.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });

    const { data: mhs } = await supa.from('mahasiswa').select('id, nrp').eq('user_id', user.id).maybeSingle();
    if (!mhs) return NextResponse.json({ success: false, message: 'Data mahasiswa tidak ditemukan' }, { status: 404 });

    const { data: session } = await supa.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', user.id).maybeSingle();
    if (!session?.ethol_cookie) return NextResponse.json({ success: false, message: 'Sesi ETHOL tidak ditemukan' }, { status: 400 });

    const jwt = await etholApi.getEtholJwtToken(session.ethol_cookie);
    if (!jwt) return NextResponse.json({ success: false, message: 'Gagal mengambil token ETHOL' }, { status: 401 });

    if (action === 'detail' && searchParams.get('kuis_id')) {
      const kuisId = parseInt(searchParams.get('kuis_id')!);
      const detail = await etholApi.getQuizDetail(jwt, kuisId, mhs.nrp);
      const waktu = await etholApi.getQuizTime(jwt, kuisId, mhs.nrp);
      return NextResponse.json({ success: true, data: { detail, waktu } });
    }

    if (action === 'review' && searchParams.get('kuis_hasil_id')) {
      const hasilId = parseInt(searchParams.get('kuis_hasil_id')!);
      const review = await etholApi.reviewQuiz(jwt, hasilId);
      return NextResponse.json({ success: true, data: review });
    }

    // List quizzes
    if (kuliahId) {
      const quizzes = await etholApi.getQuizzes(jwt, parseInt(kuliahId));
      return NextResponse.json({ success: true, data: quizzes });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, kuisId, kuisHasilId, kuisSoalId, jawabanDipilih } = body;

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

    if (action === 'answer') {
      const res = await etholApi.submitQuizAnswer(jwt, kuisHasilId, kuisSoalId, jawabanDipilih);
      return NextResponse.json({ success: true, data: res });
    }

    if (action === 'finish') {
      const res = await etholApi.finishQuiz(jwt, kuisHasilId);
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
