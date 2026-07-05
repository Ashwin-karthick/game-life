import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { colors, fonts, glow, spacing } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

const PAGES = [
  {
    icon: 'color-palette' as const,
    title: 'Your own life areas',
    body: 'Add areas that matter to you — music, faith, a side project — from the Stats tab. Each one levels up like the rest.',
  },
  {
    icon: 'flag' as const,
    title: 'Your own quests',
    body: 'Set one-time or multi-step goals with optional deadlines from the Tasks tab. Your quests never count against the offer limit.',
  },
  {
    icon: 'calendar' as const,
    title: 'Dailies got real',
    body: 'Schedule dailies for specific weekdays. Missing a scheduled day now costs XP — showing up matters.',
  },
];

/** One-time intro for existing users after the V3 update. */
export function WhatsNewOverlay() {
  const profile = useGameStore((s) => s.profile);
  const seenIntroVersion = useGameStore((s) => s.seenIntroVersion);
  const markIntroSeen = useGameStore((s) => s.markIntroSeen);
  const [page, setPage] = useState(0);

  if (!profile || seenIntroVersion >= 3) return null;

  const current = PAGES[page];
  const isLast = page === PAGES.length - 1;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={markIntroSeen}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.card, glow(colors.accentCyan, 0.25, 20)]}>
          <Text style={styles.eyebrow}>◈ WHAT'S NEW ◈</Text>
          <Animated.View key={page} entering={FadeInDown.duration(300)} style={styles.pageContent}>
            <View style={styles.iconCircle}>
              <Ionicons name={current.icon} size={30} color={colors.accentCyan} />
            </View>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.body}>{current.body}</Text>
          </Animated.View>

          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <View key={i} style={[styles.dot, i === page ? styles.dotActive : null]} />
            ))}
          </View>

          <Button
            onPress={() => (isLast ? markIntroSeen() : setPage((p) => p + 1))}
            style={{ width: '100%', marginTop: spacing(4) }}
          >
            {isLast ? "Let's go" : 'Next'}
          </Button>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,7,13,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(6),
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: `${colors.accentCyan}44`,
    padding: spacing(7),
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 3,
    color: colors.accentCyan,
  },
  pageContent: {
    alignItems: 'center',
    marginTop: spacing(5),
    minHeight: 170,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.accentCyan}18`,
    borderWidth: 1,
    borderColor: `${colors.accentCyan}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 21,
    marginTop: spacing(4),
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing(2),
  },
  dots: {
    flexDirection: 'row',
    gap: spacing(2),
    marginTop: spacing(2),
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.bgSurfaceRaised,
  },
  dotActive: {
    backgroundColor: colors.accentCyan,
  },
});
