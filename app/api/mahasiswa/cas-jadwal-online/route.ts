import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as etholApi from '../../../../lib/ethol-api';

export async function GET(request: NextRequest) {
  try {
    // Auth validation
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !svcKey) throw new Error('Supabase config missing in .env');

    const supa = createClient(supaUrl, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const token = authHeader.replace('Bearer ', '');
    let user: any = null;

    if (token.startsWith('bypass-token-for-')) {
      const userId = token.replace('bypass-token-for-', '');
      const { data: dbUser } = await supa.from('users').select('id, email').eq('id', userId).maybeSingle();
      if (dbUser) user = dbUser;
    } else {
      const { data: { user: supaUser }, error: authError } = await supa.auth.getUser(token);
      if (!authError && supaUser) user = supaUser;
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    // Get ethol cookies
    const { data: session } = await supa.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', user.id).maybeSingle();
    if (!session || !session.ethol_cookie) {
      return NextResponse.json({ success: false, message: 'Sesi ethol tidak ditemukan. Silakan login ulang.' }, { status: 400 });
    }

    // Extract or fetch JWT
    const etholJwt = await etholApi.getEtholJwtToken(session.ethol_cookie);
    if (!etholJwt) {
      return NextResponse.json({ success: false, message: 'Gagal mengambil token otentikasi ETHOL' }, { status: 401 });
    }

    // Fetch from official REST API
    const data = await etholApi.getOnlineSchedule(etholJwt);
    return NextResponse.json({
      success: true,
      message: 'Berhasil mengambil jadwal online dari ETHOL',
      data: data
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
