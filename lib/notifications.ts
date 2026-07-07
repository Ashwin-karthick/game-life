import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';

import { todayLocalDateString } from '@/lib/progression';
import { useGameStore } from '@/store/gameStore';

const REMINDER_IDENTIFIER = 'game-life-daily-reminder';

const REMINDER_MESSAGES = [
  'Your quest log is waiting, Hunter. Any progress today counts.',
  'A few minutes of real effort today keeps your growth honest.',
  'Small quests, real growth. Got a moment for one today?',
];

/**
 * Content-only priority for the single daily reminder slot: streak-at-risk >
 * weekly-challenge-almost-done > how-many-dailies-are-left. This keeps the
 * "one gentle reminder a day" promise (settings copy) while still surfacing
 * whatever's most relevant, recomputed fresh on every app open.
 */
function pickReminderMessage(): string {
  const state = useGameStore.getState();
  const now = Date.now();
  const today = todayLocalDateString(now);

  if (state.streak.currentLen > 0 && state.streak.lastActiveDate !== today) {
    return `Your ${state.streak.currentLen}-day streak is still open today — one small action keeps it alive.`;
  }

  const challenge = state.challenge;
  if (challenge && challenge.state === 'active' && challenge.targetXp > 0 && challenge.progressXp / challenge.targetXp >= 0.8) {
    return "Your weekly challenge is almost done — just a bit more XP to clear it.";
  }

  const todayWeekday = new Date(now).getDay();
  const scheduledToday = state.dailies.filter((d) => !d.archived && d.weekdays.includes(todayWeekday));
  if (scheduledToday.length > 0) {
    const remaining = scheduledToday.filter((d) => !d.completedDates.includes(today)).length;
    if (remaining === 0) return "All your dailies are done today. Nice.";
    return `${remaining} of ${scheduledToday.length} ${remaining === 1 ? 'daily is' : 'dailies are'} still open today.`;
  }

  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

let cachedModule: typeof NotificationsType | null | undefined;

function getNotifications(): typeof NotificationsType | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications') as typeof NotificationsType;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cachedModule = mod;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isReminderSupported(): boolean {
  return getNotifications() !== null;
}

/**
 * Once a user has explicitly denied the OS permission prompt, both Android 13+
 * and iOS silently no-op any further requestPermissionsAsync() call instead of
 * re-prompting — callers should check this first and send denied users to
 * system settings instead of calling requestNotificationPermission() again.
 */
export async function getReminderPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | null> {
  const notifications = getNotifications();
  if (!notifications) return null;
  try {
    const { status } = await notifications.getPermissionsAsync();
    return status;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const notifications = getNotifications();
  if (!notifications) return false;
  try {
    if (Platform.OS !== 'web') {
      const Device = require('expo-device') as typeof import('expo-device');
      if (!Device.isDevice) return false;
    }
    const existing = await notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const notifications = getNotifications();
  if (!notifications) return false;
  try {
    await notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
    const message = pickReminderMessage();
    await notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: {
        title: 'Game Life',
        body: message,
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;
  await notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
}
