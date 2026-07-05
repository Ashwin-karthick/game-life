import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

export function tapLight() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapMedium() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function tapHeavy() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function selectionTick() {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

export function notifySuccess() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Heavy → heavy → success, spaced out. Used for rank-ups. */
export function rankUpSequence() {
  if (!enabled) return;
  tapHeavy();
  setTimeout(tapHeavy, 150);
  setTimeout(notifySuccess, 350);
}
