import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, spacing } from '@/constants/theme';
import {
  cancelDailyReminder,
  isReminderSupported,
  requestNotificationPermission,
  scheduleDailyReminder,
} from '@/lib/notifications';
import { useGameStore } from '@/store/gameStore';

const HOUR_OPTIONS = [8, 12, 17, 19, 20, 21, 22];

export default function NotificationsScreen() {
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const [busy, setBusy] = useState(false);
  const [supported] = useState(() => isReminderSupported());

  async function toggleEnabled(value: boolean) {
    setBusy(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert('Permission needed', 'Enable notifications for Game Life in your device settings to get a daily reminder.');
          setBusy(false);
          return;
        }
        await scheduleDailyReminder(settings.reminderHour, settings.reminderMinute);
      } else {
        await cancelDailyReminder();
      }
      updateSettings({ reminderEnabled: value });
    } finally {
      setBusy(false);
    }
  }

  async function pickHour(hour: number) {
    updateSettings({ reminderHour: hour });
    if (settings.reminderEnabled) {
      await scheduleDailyReminder(hour, settings.reminderMinute);
    }
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Daily Reminder', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />

      <Card>
        <View style={styles.row}>
          <Ionicons name="notifications" size={22} color={colors.accentCyan} />
          <View style={{ flex: 1, marginLeft: spacing(3) }}>
            <Text style={styles.title}>One gentle reminder a day</Text>
            <Text style={styles.muted}>A single nudge, never repeated, never guilt-tripping.</Text>
          </View>
          <Switch
            value={settings.reminderEnabled}
            onValueChange={toggleEnabled}
            disabled={busy || !supported}
            trackColor={{ false: colors.bgSurfaceRaised, true: colors.accentCyan }}
          />
        </View>
      </Card>

      {!supported && (
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.muted}>
            Local reminders aren't available in this preview environment (e.g. Expo Go on newer SDKs). They'll work in a
            development build or a production install of the app.
          </Text>
        </Card>
      )}

      {supported && settings.reminderEnabled && (
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.sectionLabel}>What time?</Text>
          <View style={styles.hourRow}>
            {HOUR_OPTIONS.map((h) => {
              const selected = settings.reminderHour === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => pickHour(h)}
                  style={[styles.hourPill, selected ? styles.hourPillSelected : null]}
                >
                  <Text style={[styles.hourText, selected ? styles.hourTextSelected : null]}>
                    {h % 12 === 0 ? 12 : h % 12}
                    {h < 12 ? 'am' : 'pm'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: spacing(3),
  },
  hourRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  hourPill: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    backgroundColor: colors.bgSurfaceRaised,
  },
  hourPillSelected: {
    borderColor: colors.accentCyan,
    backgroundColor: `${colors.accentCyan}22`,
  },
  hourText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  hourTextSelected: {
    color: colors.accentCyan,
  },
});
