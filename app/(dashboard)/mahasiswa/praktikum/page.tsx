'use client';

import { useState } from 'react';
import { Layers, Laptop, ExternalLink, X } from 'lucide-react';

export default function MahasiswaPraktikumPage() {
  const [activeIframeUrl, setActiveIframeUrl] = useState<string | null>(null);

  const practiceItems = [
    {
      title: 'Paket Pemrograman & Database',
      desc: 'Praktik pemrograman terintegrasi interaktif via W3Schools',
      icon: Layers,
      color: '#ec4899',
      iframeUrl: 'https://www.w3schools.com/html/default.asp',
    },
    {
      title: 'Tools Pemrograman Web',
      desc: 'Akses compiler online, dokumentasi API, dan editor web terpadu',
      icon: Laptop,
      color: '#3b82f6',
      iframeUrl: 'https://onecompiler.com/html',
    }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Lab & Praktikum Virtual
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Gunakan materi praktikum interaktif dan compiler terintegrasi untuk menguji kode pemrograman Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {practiceItems.map((item, idx) => (
          <div
            key={idx}
            className="card p-6"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--color-border)',
              height: '200px',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: `${item.color}15`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <item.icon size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                {item.title}
              </h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                {item.desc}
              </p>
            </div>

            <button
              onClick={() => setActiveIframeUrl(item.iframeUrl)}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>Mulai Praktik</span>
              <ExternalLink size={12} />
            </button>
          </div>
        ))}
      </div>

      {activeIframeUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '1rem 1.5rem',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Praktikum Interaktif Sandbox
            </h3>
            <button
              onClick={() => setActiveIframeUrl(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={22} />
            </button>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <iframe
              src={activeIframeUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Praktikum Sandbox"
            />
          </div>
        </div>
      )}
    </div>
  );
}
