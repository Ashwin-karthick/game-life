import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, fonts, spacing } from '@/constants/theme';
import { notifySuccess } from '@/lib/haptics';
import { isSupabaseConfigured } from '@/lib/supabase';
import { reconcileAfterAuth } from '@/lib/sync';
import { useAuthStore } from '@/store/authStore';

type Mode = 'signIn' | 'signUp';

export function AccountCard() {
  const authLoading = useAuthStore((s) => s.authLoading);
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <Text style={styles.sectionLabel}>BACK UP &amp; SYNC</Text>
        <Text style={styles.muted}>Not set up for this build yet — see the README for setup steps. Local backup below still works.</Text>
      </Card>
    );
  }

  if (authLoading) {
    return (
      <Card>
        <Text style={styles.sectionLabel}>BACK UP &amp; SYNC</Text>
        <Text style={styles.muted}>Checking sign-in status…</Text>
      </Card>
    );
  }

  if (session && user) {
    return (
      <Card>
        <Text style={styles.sectionLabel}>BACK UP &amp; SYNC</Text>
        <View style={styles.row}>
          <Ionicons name="person-circle" size={20} color={colors.accentCyan} />
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <SyncStatusLine status={syncStatus} lastSyncedAt={lastSyncedAt} />
        <Text style={[styles.muted, { marginTop: spacing(3) }]}>
          Best on one device at a time — sync works, but two active devices can drift.
        </Text>
        <Button
          variant="ghost"
          onPress={async () => {
            setBusy(true);
            await signOut();
            setBusy(false);
          }}
          disabled={busy}
          style={{ marginTop: spacing(3) }}
        >
          Sign Out
        </Button>
      </Card>
    );
  }

  async function submit() {
    setMessage(null);
    if (!email.trim() || !password) {
      setMessage({ text: 'Enter an email and password.', tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const result = await signUp(email.trim(), password);
        if (result.error) {
          setMessage({ text: result.error, tone: 'error' });
        } else if (result.needsConfirmation) {
          setMessage({ text: 'Check your email to confirm your account, then sign in.', tone: 'info' });
          setMode('signIn');
        } else {
          notifySuccess();
          const userId = useAuthStore.getState().user?.id;
          if (userId) await reconcileAfterAuth(userId);
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          setMessage({ text: result.error, tone: 'error' });
        } else {
          notifySuccess();
          const userId = useAuthStore.getState().user?.id;
          if (userId) await reconcileAfterAuth(userId);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setMessage({ text: 'Enter your email above first.', tone: 'error' });
      return;
    }
    setBusy(true);
    const result = await resetPassword(email.trim());
    setBusy(false);
    setMessage(
      result.error ? { text: result.error, tone: 'error' } : { text: 'Check your email for a reset link.', tone: 'info' }
    );
  }

  return (
    <Card>
      <Text style={styles.sectionLabel}>BACK UP &amp; SYNC</Text>
      <Text style={styles.muted}>
        Sign in to back up your progress and bring it to a new device. Works fully offline either way.
      </Text>

      <View style={{ marginTop: spacing(4), gap: spacing(3) }}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {message && (
          <Text style={[styles.muted, { color: message.tone === 'error' ? colors.danger : colors.success }]}>
            {message.text}
          </Text>
        )}

        <Button onPress={submit} loading={busy} disabled={busy}>
          {mode === 'signIn' ? 'Sign In' : 'Create Account'}
        </Button>

        <View style={styles.linksRow}>
          <PressableScale
            haptic={false}
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setMessage(null);
            }}
          >
            <Text style={styles.link}>{mode === 'signIn' ? 'Create an account' : 'Sign in instead'}</Text>
          </PressableScale>
          {mode === 'signIn' && (
            <PressableScale haptic={false} onPress={forgotPassword}>
              <Text style={styles.link}>Forgot password?</Text>
            </PressableScale>
          )}
        </View>
      </View>
    </Card>
  );
}

function SyncStatusLine({ status, lastSyncedAt }: { status: string; lastSyncedAt: number | null }) {
  const text =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'error'
      ? "Couldn't sync — will retry"
      : lastSyncedAt
      ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
      : 'Waiting for first sync…';
  const color = status === 'error' ? colors.danger : status === 'syncing' ? colors.textMuted : colors.success;

  return (
    <View style={styles.row}>
      <Ionicons
        name={status === 'error' ? 'alert-circle' : status === 'syncing' ? 'sync' : 'checkmark-circle'}
        size={14}
        color={color}
      />
      <Text style={[styles.muted, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: spacing(3),
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(1),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(2),
  },
  email: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 14,
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: 10,
    padding: spacing(3),
    color: colors.textPrimary,
    backgroundColor: colors.bgSurfaceRaised,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '600',
  },
});
