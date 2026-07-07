import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useGameStore } from '@/store/gameStore';

function isEnabled(): boolean {
  if (Platform.OS === 'web') return false;
  return useGameStore.getState().settings.hapticsEnabled;
}

export function tapLight() {
  if (isEnabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapMedium() {
  if (isEnabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function tapHeavy() {
  if (isEnabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function selectionTick() {
  if (isEnabled()) Haptics.selectionAsync().catch(() => {});
}

export function notifySuccess() {
  if (isEnabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Heavy → heavy → success, spaced out. Used for rank-ups. */
export function rankUpSequence() {
  if (!isEnabled()) return;
  tapHeavy();
  setTimeout(tapHeavy, 150);
  setTimeout(notifySuccess, 350);
}
