import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeOutDown, SlideInDown } from 'react-native-reanimated';

import { colors, fonts, glow, radius, spacing } from '@/constants/theme';
import { tapMedium } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { useUndoStore } from '@/store/undoStore';

const UNDO_LIFETIME_MS = 5000;

/**
 * A single, targeted undo toast — offered right after a habit slip or daily
 * completion, never a generic "undo last action" stack. Auto-dismisses after
 * 5 seconds, same as the window undoHabitSlip/uncompleteDaily are designed for.
 */
export function UndoToastHost() {
  const pending = useUndoStore((s) => s.pending);
  const dismiss = useUndoStore((s) => s.dismiss);
  const undoHabitSlip = useGameStore((s) => s.undoHabitSlip);
  const uncompleteDaily = useGameStore((s) => s.uncompleteDaily);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => dismiss(), UNDO_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [pending, dismiss]);

  if (!pending) return null;

  function handleUndo() {
    if (!pending) return;
    tapMedium();
    if (pending.kind === 'habit_slip') undoHabitSlip(pending.id);
    else uncompleteDaily(pending.id);
    dismiss();
  }

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(14)}
      exiting={FadeOutDown.duration(250)}
      style={[styles.toast, glow(colors.accentCyan, 0.4, 12)]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {pending.label}
      </Text>
      <Pressable onPress={handleUndo} hitSlop={10} style={styles.undoButton} accessibilityRole="button" accessibilityLabel="Undo">
        <Ionicons name="arrow-undo" size={14} color={colors.accentCyan} />
        <Text style={styles.undoText}>UNDO</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing(4),
    right: spacing(4),
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    gap: spacing(3),
  },
  label: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  undoText: {
    color: colors.accentCyan,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1,
  },
});
