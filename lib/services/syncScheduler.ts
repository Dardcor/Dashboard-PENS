import prisma from '../prisma';
import { syncEtholData } from './etholSync';
import { syncMisData } from './misSync';
import { getEtholJwtToken } from '../ethol-api';

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
}

interface ScheduledSyncOptions {
  userId: string;
  syncEthol?: boolean;
  syncMis?: boolean;
  force?: boolean;
}

const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const syncHistory: Map<string, number> = new Map();

export async function validateAndSyncUser(options: ScheduledSyncOptions): Promise<{
  etholResult?: SyncResult;
  misResult?: SyncResult;
  elapsed: number;
}> {
  const startTime = Date.now();
  const { userId, syncEthol = true, syncMis = true, force = false } = options;

  if (!force) {
    const lastSync = syncHistory.get(userId);
    if (lastSync && (Date.now() - lastSync) < SYNC_COOLDOWN_MS) {
      const remaining = Math.round((SYNC_COOLDOWN_MS - (Date.now() - lastSync)) / 1000);
      return {
        etholResult: { success: true, message: `Sync skipped (cooldown, ${remaining}s remaining)` },
        elapsed: 0
      };
    }
  }

  syncHistory.set(userId, Date.now());

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { mahasiswa: true, ethol_session: true }
  });

  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  if (!user.ethol_session?.ethol_cookie) {
    throw new Error('Sesi ETHOL tidak ditemukan. Silakan login ulang.');
  }

  const cookie = user.ethol_session.ethol_cookie;

  const results: { etholResult?: SyncResult; misResult?: SyncResult } = {};

  if (syncEthol) {
    try {
      console.log(`[SCHEDULER] Starting ETHOL sync for ${userId}...`);
      const etholResult = await syncEtholData(userId, cookie);
      results.etholResult = etholResult;
    } catch (err: any) {
      results.etholResult = { success: false, error: err.message };
    }
  }

  if (syncMis) {
    try {
      console.log(`[SCHEDULER] Starting MIS sync for ${userId}...`);
      const misResult = await syncMisData(userId, cookie);
      results.misResult = misResult;
    } catch (err: any) {
      results.misResult = { success: false, error: err.message };
    }
  }

  await prisma.userEtholSession.update({
    where: { user_id: userId },
    data: { last_sync_at: new Date() }
  });

  const elapsed = Date.now() - startTime;
  console.log(`[SCHEDULER] Sync completed for ${userId} in ${elapsed}ms`);

  return { ...results, elapsed };
}

export async function syncAllUsers(options: { syncEthol?: boolean; syncMis?: boolean } = {}) {
  const { syncEthol = true, syncMis = true } = options;

  const sessions = await prisma.userEtholSession.findMany({
    where: { last_sync_at: { not: null } },
    include: { user: { include: { mahasiswa: true } } }
  });

  console.log(`[SCHEDULER] Sync all: ${sessions.length} users with active sessions`);

  const results: { userId: string; success: boolean; message: string; elapsed: number }[] = [];

  for (const session of sessions) {
    try {
      const start = Date.now();
      if (syncEthol) {
        await syncEtholData(session.user_id, session.ethol_cookie);
      }
      if (syncMis) {
        await syncMisData(session.user_id, session.ethol_cookie);
      }
      const elapsed = Date.now() - start;
      results.push({ userId: session.user_id, success: true, message: 'OK', elapsed });
    } catch (err: any) {
      results.push({ userId: session.user_id, success: false, message: err.message, elapsed: 0 });
    }
  }

  return results;
}

export function clearSyncHistory(userId?: string) {
  if (userId) {
    syncHistory.delete(userId);
  } else {
    syncHistory.clear();
  }
}
