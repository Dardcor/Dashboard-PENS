import { NextResponse } from 'next/server';
import { syncMisData } from '@/lib/services/misSync';

export async function POST(request: Request) {
  try {
    const { cookie, userId } = await request.json();

    if (!cookie) {
      return NextResponse.json({ success: false, error: 'Cookie MIS wajib disertakan.' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'UserId (ID Mahasiswa) wajib disertakan untuk menghubungkan data.' }, { status: 400 });
    }

    // Panggil service sinkronisasi yang telah dibuat untuk upsert secara aman
    const result = await syncMisData(userId, cookie);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
       success: true, 
       message: 'Data berhasil discrape dan database disinkronisasi persis seperti sistem MIS kampus tanpa duplikasi.',
       data: result
    });

  } catch (error: any) {
    console.error('Error in MIS Scrape API:', error);
    return NextResponse.json({ 
       success: false, 
       error: error.message || 'Terjadi kesalahan saat memproses data scraping MIS.' 
    }, { status: 500 });
  }
}
