'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)',
          margin: '1rem 0', color: 'var(--color-text-secondary)',
        }}>
          <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Terjadi Kesalahan
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            {this.state.error?.message || 'Gagal memuat komponen ini'}
          </p>
          <button className="btn btn-secondary" onClick={this.handleRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
