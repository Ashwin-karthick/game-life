import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). ' +
      'Copy .env.example to .env and fill in your project values. Auth and sync will not work until then.'
  );
}

// expo-secure-store caps individual values at ~2048 bytes on iOS, but a
// Supabase session (access + refresh token + user metadata) regularly
// exceeds that. This adapter transparently splits large values across
// multiple SecureStore entries so session persistence never silently fails.
const CHUNK_SIZE = 1800;

async function getChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${key}_chunks`);
  return raw ? parseInt(raw, 10) : 0;
}

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCount = await getChunkCount(key);
    if (chunkCount === 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`))
    );
    if (chunks.some((c) => c === null)) return null;
    return chunks.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const previousCount = await getChunkCount(key);
    const newChunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      newChunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all(newChunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)));
    // Clean up now-unused chunks left over from a previously larger value.
    for (let i = newChunks.length; i < previousCount; i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
    await SecureStore.setItemAsync(`${key}_chunks`, String(newChunks.length));
  },
  async removeItem(key: string): Promise<void> {
    const chunkCount = await getChunkCount(key);
    await Promise.all(Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)));
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  },
};

// expo-secure-store has no web implementation; localStorage is the
// equivalent persistence primitive there (this app also runs via `expo
// start --web`).
const WebStorageAdapter = {
  getItem: async (key: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

// createClient throws synchronously if given an empty/invalid URL, so an
// unconfigured app needs a syntactically valid placeholder here — every real
// call site is already gated behind `isSupabaseConfigured` below, so this
// placeholder is never actually used for a network request.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    storage: Platform.OS === 'web' ? WebStorageAdapter : SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
