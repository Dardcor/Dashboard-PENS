'use client';

import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { RealtimeProvider } from '../context/RealtimeContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
