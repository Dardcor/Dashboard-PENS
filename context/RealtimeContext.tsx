'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { etholWs } from '../lib/websocket';
import { useAuth } from './AuthContext';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface LiveNilai {
  mahasiswa_id: string;
  mata_kuliah_id: string;
  nilai_akhir: number;
  grade: string;
  semester_id: string;
  updated_at: string;
}

export interface LiveKehadiran {
  mahasiswa_id: string;
  mata_kuliah_id: string;
  persentase_kehadiran: number;
  total_pertemuan: number;
  hadir: number;
  alpha: number;
  semester_id: string;
}

export interface LiveAlert {
  id: string;
  mahasiswa_id: string;
  tipe_alert: string;
  status: string;
  created_at: string;
}

export interface LiveIPK {
  mahasiswa_id: string;
  ips: number;
  ipk_kumulatif: number;
  sks_semester: number;
  sks_kumulatif: number;
  semester_id: string;
}

export interface LiveJadwal {
  id: string;
  mahasiswa_id: string;
  dosen_wali_id: string;
  status: string;
  waktu_mulai: string;
}

export interface LiveTugas {
  id: string;
  mahasiswa_id: string;
  judul: string;
  deadline: string | null;
  status: string;
}

interface RealtimeContextValue {
  nilaiChanges: LiveNilai[];
  kehadiranChanges: LiveKehadiran[];
  alertBaru: LiveAlert[];
  ipkUpdates: LiveIPK[];
  jadwalUpdates: LiveJadwal[];
  tugasUpdates: LiveTugas[];
  wsEventLog: { type: string; data: any; timestamp: Date }[];
  clearAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  nilaiChanges: [],
  kehadiranChanges: [],
  alertBaru: [],
  ipkUpdates: [],
  jadwalUpdates: [],
  tugasUpdates: [],
  wsEventLog: [],
  clearAlert: () => {},
  clearAllAlerts: () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const [nilaiChanges, setNilaiChanges] = useState<LiveNilai[]>([]);
  const [kehadiranChanges, setKehadiranChanges] = useState<LiveKehadiran[]>([]);
  const [alertBaru, setAlertBaru] = useState<LiveAlert[]>([]);
  const [ipkUpdates, setIpkUpdates] = useState<LiveIPK[]>([]);
  const [jadwalUpdates, setJadwalUpdates] = useState<LiveJadwal[]>([]);
  const [tugasUpdates, setTugasUpdates] = useState<LiveTugas[]>([]);
  const [wsEventLog, setWsEventLog] = useState<{ type: string; data: any; timestamp: Date }[]>([]);
  const changesRef = useRef({ nilai: 0, kehadiran: 0, alert: 0 });

  const addWsEvent = useCallback((type: string, data: any) => {
    setWsEventLog((prev) => {
      const next = [{ type, data, timestamp: new Date() }, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  // Subscribe to Supabase real-time changes based on role
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    const mhsFilter = role === 'mahasiswa' ? `mahasiswa_id=eq.${user.id}` : undefined;

    const tables = [
      { table: 'nilai_mahasiswa', setter: setNilaiChanges, filter: mhsFilter },
      { table: 'kehadiran', setter: setKehadiranChanges, filter: mhsFilter },
      { table: 'alert_akademik', setter: setAlertBaru, filter: mhsFilter },
      { table: 'ipk_history', setter: setIpkUpdates, filter: mhsFilter },
      { table: 'jadwal_konsultasi', setter: setJadwalUpdates, filter: undefined },
    ];

    for (const { table, setter, filter } of tables) {
      const channel = supabase
        .channel(`realtime-${table}-${user.id}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table,
            filter: filter ?? undefined,
          } as any,
          (payload: RealtimePostgresChangesPayload<any>) => {
            const record = payload.new as any;
            if (!record) return;

            if (table === 'nilai_mahasiswa' && record.mahasiswa_id) {
              changesRef.current.nilai++;
              setter((prev: any[]) => [{
                mahasiswa_id: record.mahasiswa_id,
                mata_kuliah_id: record.mata_kuliah_id,
                nilai_akhir: record.nilai_akhir,
                grade: record.grade,
                semester_id: record.semester_id,
                updated_at: record.updated_at,
              } as LiveNilai, ...prev].slice(0, 20));
              addWsEvent('NILAI_UPDATE', record);
            }

            if (table === 'kehadiran' && record.mahasiswa_id) {
              changesRef.current.kehadiran++;
              setter((prev: any[]) => [{
                mahasiswa_id: record.mahasiswa_id,
                mata_kuliah_id: record.mata_kuliah_id,
                persentase_kehadiran: record.persentase_kehadiran,
                total_pertemuan: record.total_pertemuan,
                hadir: record.hadir,
                alpha: record.alpha,
                semester_id: record.semester_id,
              } as LiveKehadiran, ...prev].slice(0, 20));
              addWsEvent('KEHADIRAN_UPDATE', record);
            }

            if (table === 'alert_akademik' && record.id && record.status === 'aktif') {
              changesRef.current.alert++;
              setter((prev: any[]) => [{
                id: record.id,
                mahasiswa_id: record.mahasiswa_id,
                tipe_alert: record.tipe_alert,
                status: record.status,
                created_at: record.created_at,
              } as LiveAlert, ...prev].slice(0, 30));
              addWsEvent('ALERT_BARU', record);
              showBrowserNotification('Alert Akademik Baru', getAlertMessage(record.tipe_alert));
            }

            if (table === 'ipk_history' && record.mahasiswa_id) {
              setter((prev: any[]) => [{
                mahasiswa_id: record.mahasiswa_id,
                ips: record.ips,
                ipk_kumulatif: record.ipk_kumulatif,
                sks_semester: record.sks_semester,
                sks_kumulatif: record.sks_kumulatif,
                semester_id: record.semester_id,
              } as LiveIPK, ...prev].slice(0, 20));
              addWsEvent('IPK_UPDATE', record);
            }

            if (table === 'jadwal_konsultasi' && record.id) {
              const jadwal = {
                id: record.id,
                mahasiswa_id: record.mahasiswa_id,
                dosen_wali_id: record.dosen_wali_id,
                status: record.status,
                waktu_mulai: record.waktu_mulai,
              } as LiveJadwal;
              setter((prev: any[]) => [jadwal, ...prev].slice(0, 20));
              addWsEvent('JADWAL_UPDATE', record);
              if (record.status === 'menunggu') {
                showBrowserNotification('Jadwal Konsultasi Baru', 'Ada permintaan konsultasi baru');
              }
            }
          }
        )
        .subscribe();

      channels.push(channel);
    }

    const wsHandlers: (() => void)[] = [];
    const eventTypes = ['PRESENSI', 'TUGAS', 'MATERI', 'PENGUMUMAN', 'CHAT', 'NILAI', 'ALERT'];

    for (const eventType of eventTypes) {
      const unsub = etholWs.on(eventType, (data: any) => {
        addWsEvent(eventType, data);
      });
      wsHandlers.push(unsub);
    }

    const unsubConnected = etholWs.on('_connected', () => {
      addWsEvent('WS_CONNECTED', {});
    });

    return () => {
      for (const ch of channels) ch.unsubscribe();
      for (const unsub of wsHandlers) unsub();
      unsubConnected();
    };
  }, [user, role, addWsEvent]);

  const clearAlert = useCallback((id: string) => {
    setAlertBaru((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlertBaru([]);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        nilaiChanges,
        kehadiranChanges,
        alertBaru,
        ipkUpdates,
        jadwalUpdates,
        tugasUpdates,
        wsEventLog,
        clearAlert,
        clearAllAlerts,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

function getAlertMessage(tipe: string): string {
  const messages: Record<string, string> = {
    nilai_rendah: 'Nilai akademik Anda perlu perhatian',
    kehadiran_buruk: 'Kehadiran Anda di bawah threshold',
    ipk_turun: 'IPK Anda mengalami penurunan',
    sks_tidak_cukup: 'SKS yang diambil tidak mencukupi',
    belum_konsultasi: 'Belum ada catatan perwalian',
  };
  return messages[tipe] || 'Perhatian akademik diperlukan';
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.png' });
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/logo.png' });
      }
    });
  }
}
