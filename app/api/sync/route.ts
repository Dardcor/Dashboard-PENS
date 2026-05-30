import { NextResponse } from 'next/server';
import { validateAndSyncUser, syncAllUsers } from '@/lib/services/syncScheduler';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, syncEthol = true, syncMis = true, force = false } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId wajib disertakan.' }, { status: 400 });
    }

    const result = await validateAndSyncUser({ userId, syncEthol, syncMis, force });

    return NextResponse.json({
      success: true,
      message: 'Sinkronisasi selesai.',
      data: {
        ethol: result.etholResult,
        mis: result.misResult,
        elapsed_ms: result.elapsed,
      }
    });
  } catch (error: any) {
    console.error('[SYNC API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const syncEthol = searchParams.get('syncEthol') !== 'false';
    const syncMis = searchParams.get('syncMis') !== 'false';

    if (userId === 'all') {
      const results = await syncAllUsers({ syncEthol, syncMis });
      return NextResponse.json({ success: true, message: 'Sync all completed.', results });
    }

    if (userId) {
      const result = await validateAndSyncUser({ userId, syncEthol, syncMis, force: true });
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'Parameter userId wajib.' }, { status: 400 });
  } catch (error: any) {
    console.error('[SYNC API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
