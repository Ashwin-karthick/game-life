import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isSentryConfigured = Boolean(dsn);

/**
 * No-ops entirely if EXPO_PUBLIC_SENTRY_DSN isn't set — same
 * graceful-degradation pattern as lib/supabase.ts's isSupabaseConfigured.
 * Safe to call unconditionally at app boot.
 */
export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}
