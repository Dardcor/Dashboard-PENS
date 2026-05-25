export function SkeletonCard({ height = '100px' }: { height?: string }) {
  return (
    <div className="card" style={{
      padding: '1.25rem',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }}>
      <div style={{
        height,
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-border)',
        opacity: 0.5,
      }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: '40px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-border)',
          opacity: 0.3 + (i / rows) * 0.3,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }} />
      ))}
    </div>
  );
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div style={{
      height: '14px', width, borderRadius: '4px',
      backgroundColor: 'var(--color-border)',
      opacity: 0.4,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }} />
  );
}
