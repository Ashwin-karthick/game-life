import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutUp, ZoomIn } from 'react-native-reanimated';

import { colors, fonts, glow, radius, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { tapMedium } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { AttributeDef, ProgressionEvent } from '@/types/game';

interface FloatingToast {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}

const TOAST_LIFETIME_MS = 1600;

function toastForEvent(e: ProgressionEvent, defs: Record<string, AttributeDef>): FloatingToast | null {
  switch (e.type) {
    case 'xp_grant':
      if (e.amount <= 0) return null;
      return {
        id: e.id,
        icon: 'flash',
        text: `+${Math.round(e.amount)} XP`,
        color: e.attributeKey ? resolveDef(defs, e.attributeKey).color : colors.accentCyan,
      };
    case 'loot_drop':
      return { id: e.id, icon: 'gift', text: e.note.replace('Found: ', '') + ' found!', color: colors.accentViolet };
    case 'challenge_clear':
      return { id: e.id, icon: 'trophy', text: `+${Math.round(e.amount)} gems`, color: colors.accentGold };
    case 'reward_redeem':
      return { id: e.id, icon: 'diamond', text: `${Math.round(e.amount)} gems`, color: colors.accentCyan };
    default:
      return null;
  }
}

/**
 * Watches the event log and pops floating feedback chips for new XP grants,
 * loot drops, challenge clears, and reward redemptions. Purely visual.
 */
export function XpToastHost() {
  const events = useGameStore((s) => s.events);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const [toasts, setToasts] = useState<FloatingToast[]>([]);
  const lastCount = useRef(events.length);

  useEffect(() => {
    if (events.length > lastCount.current) {
      const fresh = events
        .slice(lastCount.current)
        .map((e) => toastForEvent(e, attributeDefs))
        .filter((t): t is FloatingToast => t !== null);
      if (fresh.length > 0) {
        tapMedium();
        setToasts((prev) => [...prev, ...fresh]);
      }
    }
    lastCount.current = events.length;
  }, [events, attributeDefs]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.host}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDone={remove} />
      ))}
    </View>
  );
}

function Toast({ toast, onDone }: { toast: FloatingToast; onDone: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(toast.id), TOAST_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDone]);

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12)}
      exiting={FadeOutUp.duration(350)}
      style={[styles.toast, { borderColor: toast.color }, glow(toast.color, 0.5, 12)]}
    >
      <Ionicons name={toast.icon} size={14} color={toast.color} />
      <Text style={[styles.text, { color: toast.color }]}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 170,
    alignItems: 'center',
    gap: spacing(2),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  text: {
    fontFamily: fonts.display,
    fontSize: 13,
  },
});
