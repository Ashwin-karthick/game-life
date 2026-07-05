import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_IDENTIFIER = 'game-life-daily-reminder';

const REMINDER_MESSAGES = [
  'Your quest log is waiting, Hunter. Any progress today counts.',
  'A few minutes of real effort today keeps your growth honest.',
  'Small quests, real growth. Got a moment for one today?',
];

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
    const message = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
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
