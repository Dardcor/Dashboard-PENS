import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as etholApi from '../../../../lib/ethol-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nomor = searchParams.get('nomor');
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

    const { data: session } = await supa.from('user_ethol_sessions').select('ethol_cookie').eq('user_id', user.id).maybeSingle();
    if (!session?.ethol_cookie) return NextResponse.json({ success: false, message: 'Sesi ETHOL tidak ditemukan' }, { status: 400 });

    const jwt = await etholApi.getEtholJwtToken(session.ethol_cookie);
    if (!jwt) return NextResponse.json({ success: false, message: 'Gagal mengambil token ETHOL' }, { status: 401 });

    if (action === 'detail' && nomor) {
      const [detail, replies] = await Promise.all([
        etholApi.getSupportTicketDetail(jwt, parseInt(nomor)),
        etholApi.getSupportTicketReplies(jwt, parseInt(nomor)),
      ]);
      return NextResponse.json({ success: true, data: { detail, replies } });
    }

    const tickets = await etholApi.getSupportTickets(jwt);
    return NextResponse.json({ success: true, data: tickets });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, judul, keterangan, nomor, balasan } = body;

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

    if (action === 'create') {
      const res = await etholApi.createSupportTicket(jwt, { judul, keterangan, hakAkses: 'mahasiswa' });
      return NextResponse.json({ success: true, data: res });
    }

    if (action === 'reply' && nomor && balasan) {
      const res = await etholApi.replySupportTicket(jwt, nomor, balasan);
      return NextResponse.json({ success: true, data: res });
    }

    if (action === 'resolve' && nomor) {
      const res = await etholApi.resolveSupportTicket(jwt, nomor);
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nomor = searchParams.get('nomor');

  if (!nomor) return NextResponse.json({ success: false, message: 'Nomor required' }, { status: 400 });

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

    const res = await etholApi.deleteSupportTicket(jwt, parseInt(nomor));
    return NextResponse.json({ success: true, data: res });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
