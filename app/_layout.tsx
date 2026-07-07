import { Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { AppState, StatusBar, View } from 'react-native';
import 'react-native-reanimated';

import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { UndoToastHost } from '@/components/UndoToastHost';
import { WhatsNewOverlay } from '@/components/WhatsNewOverlay';
import { XpToastHost } from '@/components/XpToastHost';
import { colors } from '@/constants/theme';
import { isReminderSupported, scheduleDailyReminder } from '@/lib/notifications';
import { initSentry } from '@/lib/sentry';
import { startSyncEngine, syncOnForeground } from '@/lib/sync';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
// No-ops until EXPO_PUBLIC_SENTRY_DSN is set — called at module scope so it
// captures errors as early as possible, same as Sentry's own docs recommend.
initSentry();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const profile = useGameStore((s) => s.profile);
  const tickOnAppOpen = useGameStore((s) => s.tickOnAppOpen);
  const reminderEnabled = useGameStore((s) => s.settings.reminderEnabled);
  const reminderHour = useGameStore((s) => s.settings.reminderHour);
  const reminderMinute = useGameStore((s) => s.settings.reminderMinute);
  const appState = useRef(AppState.currentState);

  function refreshReminderContent() {
    if (reminderEnabled && isReminderSupported()) {
      void scheduleDailyReminder(reminderHour, reminderMinute);
    }
  }

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  useEffect(() => startSyncEngine(), []);

  useEffect(() => {
    if (!hasHydrated || !profile) return;
    tickOnAppOpen();
    refreshReminderContent();

    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        tickOnAppOpen();
        refreshReminderContent();
        syncOnForeground();
      }
      appState.current = next;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, profile, tickOnAppOpen, reminderEnabled, reminderHour, reminderMinute]);

  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
        <StatusBar barStyle="light-content" />
        <OnboardingFlow />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgBase },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quick-log" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-reward" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-area" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-quest" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shop" options={{ presentation: 'card' }} />
        <Stack.Screen name="perks" options={{ presentation: 'card' }} />
        <Stack.Screen name="quest/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="attribute/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="journal" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      </Stack>
      <CelebrationOverlay />
      <WhatsNewOverlay />
      <XpToastHost />
      <UndoToastHost />
    </View>
  );
}
