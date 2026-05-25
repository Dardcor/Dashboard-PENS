import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as etholApi from '../../../../lib/ethol-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filterNotif = searchParams.get('filter') || 'SEMUA';

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

    const [notifications, unreadCount] = await Promise.all([
      etholApi.getNotifications(jwt, filterNotif),
      etholApi.getUnreadNotificationCount(jwt),
    ]);

    // Sync ETHOL notifications to local DB for persistence
    if (Array.isArray(notifications) && notifications.length > 0) {
      const { data: mhs } = await supa.from('mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
      if (mhs) {
        for (const n of notifications) {
          await supa.from('notifikasi').upsert({
            user_id: user.id,
            mahasiswa_id: mhs.id,
            judul: n.kodeNotifikasi || 'Notifikasi ETHOL',
            pesan: n.keterangan || '',
            tipe: 'info',
            status: n.status === '1' || n.status === 'dibaca' ? 'sudah_dibaca' : 'belum_dibaca',
            link_target: n.urlWeb || null,
          }, { onConflict: 'id' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: notifications,
      unread: unreadCount,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { idNotif } = body;

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

    const res = await etholApi.markNotificationRead(jwt, idNotif);
    return NextResponse.json({ success: true, data: res });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
