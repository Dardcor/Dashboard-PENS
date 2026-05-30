import * as cheerio from 'cheerio';

export interface EtholScrapedData {
  beranda: any[];
  matakuliah: any[];
  jadwal: any[];
}

/**
 * Helper untuk parsing halaman Beranda
 */
export function parseBeranda(html: string) {
  const $ = cheerio.load(html);
  const data: any[] = [];
  
  // Karena struktur ETHOL spesifik, kita tangkap info utama 
  // seperti IPK, SKS, dan daftar Pengumuman.
  
  // Contoh asumsikan pengumuman ada di elemen dengan class .card-announcement
  // atau tabel ringkasan. Kita coba ambil tabel umum jika tidak tau persis class-nya.
  // Untuk level ini, kita tangkap teks penting dan tabel jika ada.
  
  // Scraping elemen spesifik (Ini asumsi struktur umum jika class tidak diketahui,
  // tapi biasanya ada teks "IPK" atau "SKS")
  const userInfo = {
    nama: $('h4, .user-name, .profile-name').first().text().trim(),
    nrp: $('p:contains("NRP"), .user-id').first().text().replace(/[^0-9]/g, '').trim(),
  };

  // Mencari tabel apapun di beranda (misal riwayat IPK singkat)
  $('table').each((i, table) => {
    const headers: string[] = [];
    $(table).find('th').each((j, th) => {
      headers.push($(th).text().trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
    });

    $(table).find('tbody tr').each((j, tr) => {
      const rowData: any = { type: 'tabel_beranda' };
      $(tr).find('td').each((k, td) => {
        const key = headers[k] || `kolom_${k}`;
        rowData[key] = $(td).text().trim();
      });
      data.push(rowData);
    });
  });

  // Jika tidak ada tabel, push info user
  data.push({ type: 'user_info', ...userInfo });

  // Scraping list pengumuman
  $('.alert, .card-body p, .announcement-item').each((i, el) => {
    const teks = $(el).text().trim();
    if (teks) {
       data.push({ type: 'pengumuman', konten: teks });
    }
  });

  return data;
}

/**
 * Helper untuk parsing halaman Mata Kuliah
 */
export function parseMataKuliah(html: string) {
  const $ = cheerio.load(html);
  const data: any[] = [];

  // Fokus mencari tabel daftar mata kuliah
  $('table').each((i, table) => {
    const headers: string[] = [];
    $(table).find('thead th, tr:first-child th').each((j, th) => {
       // Buat header jadi safe string (snake_case)
       let headerText = $(th).text().trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
       if(!headerText) headerText = `kolom_${j}`;
       headers.push(headerText);
    });

    $(table).find('tbody tr').each((j, tr) => {
      const rowData: any = {};
      $(tr).find('td').each((k, td) => {
        const key = headers[k] || `kolom_${k}`;
        rowData[key] = $(td).text().trim();
      });
      
      // Hanya simpan jika row memiliki data (bukan tr kosong)
      if (Object.keys(rowData).length > 0 && Object.values(rowData).some(v => v !== '')) {
         data.push(rowData);
      }
    });
  });
  
  // Jika mata kuliah pakai div cards bukan table
  $('.card').each((i, card) => {
      const title = $(card).find('.card-title, h3, h4, h5').text().trim();
      if(title && title.length > 3) {
          const body = $(card).find('.card-body, p').text().trim();
          data.push({ judul: title, detail: body, type: 'card_matkul' });
      }
  });

  return data;
}

/**
 * Helper untuk parsing halaman Jadwal
 */
export function parseJadwal(html: string) {
  const $ = cheerio.load(html);
  const data: any[] = [];

  // Mengambil jadwal harian dari tabel
  $('table').each((i, table) => {
    const headers: string[] = [];
    $(table).find('thead th, tr:first-child th').each((j, th) => {
       let headerText = $(th).text().trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
       if(!headerText) headerText = `kolom_${j}`;
       headers.push(headerText);
    });

    $(table).find('tbody tr').each((j, tr) => {
      const rowData: any = {};
      $(tr).find('td').each((k, td) => {
        const key = headers[k] || `kolom_${k}`;
        // Mengambil link jika ada (misal link Vicon)
        const link = $(td).find('a').attr('href');
        rowData[key] = $(td).text().trim();
        if (link) {
           rowData[`${key}_link`] = link;
        }
      });
      
      if (Object.keys(rowData).length > 0 && Object.values(rowData).some(v => v !== '')) {
         data.push(rowData);
      }
    });
  });

  return data;
}
