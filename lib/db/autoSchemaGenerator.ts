import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

// Path ke file schema.prisma
const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');

/**
 * Menghasilkan string tipe data Prisma berdasarkan value JS
 */
function getPrismaType(value: any): string {
  if (value === null || value === undefined || value === '') return 'String?';
  if (typeof value === 'number') {
     return Number.isInteger(value) ? 'Int' : 'Float';
  }
  if (typeof value === 'boolean') return 'Boolean';
  
  // Cek apakah string adalah format tanggal (sederhana)
  if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}/;
      if (dateRegex.test(value) && !isNaN(Date.parse(value))) {
          return 'DateTime?';
      }
  }
  
  return 'String?';
}

/**
 * Mengubah array object hasil scraping menjadi model string Prisma
 */
export async function generatePrismaModel(modelName: string, dataArray: any[]): Promise<string> {
  if (!dataArray || dataArray.length === 0) {
     return '';
  }

  // Gabungkan semua keys dari semua object di array
  // untuk mendapatkan representasi skema terlengkap
  const schemaMap: Record<string, string> = {};
  
  dataArray.forEach(row => {
     Object.keys(row).forEach(key => {
         // Hindari key yang tidak valid di Prisma (hanya huruf, angka, underscore)
         const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '');
         if (cleanKey && !schemaMap[cleanKey]) {
             schemaMap[cleanKey] = getPrismaType(row[key]);
         } else if (cleanKey && schemaMap[cleanKey] === 'String?' && getPrismaType(row[key]) !== 'String?') {
             // Jika sebelumnya String?, tapi ketemu data yang lebih spesifik (misal Int), upgrade tipenya
             // Tapi demi keamanan scraping (data sering kotor string), lebih baik tetap biarkan String? atau paksa fallback
             // Untuk amannya, biarkan sebagai String? jika sudah tercatat.
         }
     });
  });

  // Jika tidak ada keys
  if (Object.keys(schemaMap).length === 0) {
      return '';
  }

  // Bangun string model
  let modelString = `\n// Auto-generated dari data scraping\nmodel ${modelName} {\n`;
  modelString += `  id String @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid\n`;
  
  for (const [key, type] of Object.entries(schemaMap)) {
      // Prisma tidak mengizinkan field dimulai dengan angka, beri prefix
      const safeKey = /^[0-9]/.test(key) ? `field_${key}` : key;
      modelString += `  ${safeKey} ${type}\n`;
  }
  
  modelString += `  created_at DateTime @default(now()) @db.Timestamptz(6)\n`;
  modelString += `  @@map("auto_${modelName.toLowerCase()}")\n}\n`;

  return modelString;
}

/**
 * Fungsi utama untuk menulis ke schema.prisma dan push ke DB
 */
export async function appendSchemaAndPush(models: { name: string, data: any[] }[]) {
  try {
    let currentSchema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    let hasNewModel = false;
    let appendedString = '';

    for (const model of models) {
        // Cek jika model sudah ada di schema
        const regex = new RegExp(`model\\s+${model.name}\\s+{`);
        if (!regex.test(currentSchema)) {
            const newModelString = await generatePrismaModel(model.name, model.data);
            if (newModelString) {
               appendedString += newModelString;
               hasNewModel = true;
            }
        }
    }

    if (hasNewModel) {
        // Tulis ke file
        fs.appendFileSync(SCHEMA_PATH, appendedString);
        console.log('Berhasil menambahkan model baru ke schema.prisma');

        // Jalankan perintah Prisma DB Push
        // Note: db push ini sinkronisasi paksa skema ke DB tanpa file migrasi.
        console.log('Menjalankan prisma db push...');
        const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
        console.log('Prisma Push Output:', stdout);
        if (stderr) {
           console.warn('Prisma Push Warnings:', stderr);
        }
        
        // Generate ulang client
        console.log('Menjalankan prisma generate...');
        await execAsync('npx prisma generate');
        
        return { success: true, message: 'Schema updated and database pushed successfully.', modelsAdded: true };
    }

    return { success: true, message: 'No new models to add. Schema is up to date.', modelsAdded: false };
    
  } catch (error: any) {
    console.error('Error in autoSchemaGenerator:', error);
    throw new Error(`Gagal melakukan auto-generate: ${error.message}`);
  }
}
