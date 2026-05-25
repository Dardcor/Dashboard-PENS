'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { supabase } from '../../lib/supabase';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isMobile, isOpen } = useSidebar();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Background Sync Every 10 Minutes
  useEffect(() => {
    if (!user) return;
    
    let isSyncing = false;
    
    const syncData = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/mahasiswa/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
        }
      } catch (err) {
        console.error('Background sync failed', err);
      } finally {
        isSyncing = false;
      }
    };

    // Run every 5 minutes with smart sync
    const interval = setInterval(syncData, 5 * 60 * 1000);

    // Also sync on page visibility change (user returns to tab)
    const handleVisibility = () => {
      if (!document.hidden) syncData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <p className="text-muted">Memuat sesi...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div 
          className="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            backgroundColor: 'var(--color-background)'
          }}
        >
          <main className="page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
