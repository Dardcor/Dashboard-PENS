"use client";

import { useState } from 'react';
import { Bot, Code2, Database, Globe, Loader2, ShieldAlert } from 'lucide-react';

export default function EtholSyncPage() {
  const [cookie, setCookie] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!cookie) {
      setError("Silakan masukkan Cookie Sesi ETHOL terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ethol/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Terjadi kesalahan saat memproses permintaan.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <Bot size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistem Penetrasi & Auto-DB ETHOL</h1>
              <p className="text-gray-500">Membypass sistem login ETHOL, mengekstrak data 100% otentik, dan men-generate tabel database dinamis.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg mt-4">
            <ShieldAlert className="text-orange-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-orange-800">
              <strong>Instruksi Dosen:</strong> Alat ini menggunakan teknik <em>Session Hijacking</em> untuk mem-bypass sistem login. 
              Ambil nilai cookie (seperti `ethol_session` atau `laravel_session`) dari browser Anda melalui <code>Inspect Element -&gt; Application -&gt; Cookies</code>, lalu tempelkan di bawah.
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Input Sesi (Cookie / Headers)</label>
              <textarea 
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Contoh: ethol_session=eyJpdiI6IkV2T1... ; XSRF-TOKEN=eyJpdi..."
                className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono text-sm"
              />
            </div>
            
            <button 
              onClick={handleScrape}
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold transition-all ${
                isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Mengeksekusi Penetrasi & Rebuild Database...
                </>
              ) : (
                <>
                  <Globe size={20} />
                  Mulai Hack / Scrape Data ETHOL
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
             <ShieldAlert size={20} className="shrink-0 mt-0.5" />
             <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Result State */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* DB Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <Database size={24} />
                <h2 className="text-xl font-bold text-gray-900">Status Database</h2>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-100 mb-4">
                <strong>{result.dbStatus?.message}</strong>
              </div>
              {result.dbStatus?.modelsAdded && (
                 <p className="text-xs text-gray-500 mt-2">
                   File <code>schema.prisma</code> telah diperbarui secara otomatis. `npx prisma db push` telah dieksekusi oleh server.
                 </p>
              )}
            </div>

            {/* JSON Output preview */}
            <div className="bg-gray-900 rounded-2xl p-6 shadow-sm text-gray-100">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Code2 size={24} />
                <h2 className="text-xl font-bold text-white">Preview Data Scraping</h2>
              </div>
              <div className="h-64 overflow-y-auto bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-xs text-green-400">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
