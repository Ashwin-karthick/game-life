import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const SYNC_CURSOR_KEY = 'game-life-sync-cursor';

interface AuthResult {
  error: string | null;
  needsConfirmation?: boolean;
}

interface SyncCursor {
  id: string | null;
  timestamp: number | null;
}

/**
 * Old cursors were a bare integer (array length). We can't safely map that to
 * a specific event id after this phase adds event trimming, so a legacy
 * cursor is discarded — the next push resyncs everything, which is harmless
 * since `progression_events` upserts with `ignoreDuplicates: true`.
 */
function parseCursor(raw: string | null): SyncCursor {
  if (!raw) return { id: null, timestamp: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string' && typeof parsed.timestamp === 'number') {
      return { id: parsed.id, timestamp: parsed.timestamp };
    }
  } catch {
    // Legacy bare-integer cursor — fall through to the discarded default.
  }
  return { id: null, timestamp: null };
}

interface AuthStore {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  /** Compound cursor into the local `events` array already pushed to Supabase. */
  lastSyncedEventId: string | null;
  lastSyncedEventTimestamp: number | null;

  initAuth: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;

  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (ts: number) => void;
  setLastSyncedEventCursor: (id: string | null, timestamp: number | null) => void;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  session: null,
  user: null,
  authLoading: true,
  syncStatus: 'idle',
  lastSyncedAt: null,
  lastSyncedEventId: null,
  lastSyncedEventTimestamp: null,

  initAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ authLoading: false });
      return;
    }
    const cursorRaw = await AsyncStorage.getItem(SYNC_CURSOR_KEY);
    const cursor = parseCursor(cursorRaw);
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      lastSyncedEventId: cursor.id,
      lastSyncedEventTimestamp: cursor.timestamp,
      authLoading: false,
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Cloud backup isn’t set up yet.' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null, needsConfirmation: !data.session };
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Cloud backup isn’t set up yet.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    set({ syncStatus: 'idle', lastSyncedAt: null });
  },

  resetPassword: async (email) => {
    if (!isSupabaseConfigured) return { error: 'Cloud backup isn’t set up yet.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },

  deleteAccount: async () => {
    if (!isSupabaseConfigured) return { error: 'Cloud backup isn’t set up yet.' };
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) return { error: error.message };
      set({ session: null, user: null, syncStatus: 'idle', lastSyncedAt: null });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Something went wrong deleting your account.' };
    }
  },

  setSyncStatus: (status) => set({ syncStatus: status }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  setLastSyncedEventCursor: (id, timestamp) => {
    set({ lastSyncedEventId: id, lastSyncedEventTimestamp: timestamp });
    void AsyncStorage.setItem(SYNC_CURSOR_KEY, JSON.stringify({ id, timestamp }));
  },
}));

/** Resets the sync cursor — call alongside gameStore's resetAllData(). */
export function resetSyncCursor(): void {
  useAuthStore.getState().setLastSyncedEventCursor(null, null);
  void AsyncStorage.removeItem(SYNC_CURSOR_KEY);
}
