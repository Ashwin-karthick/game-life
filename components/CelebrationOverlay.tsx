import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { RANK_COLORS, RankBadge } from '@/components/ui/RankBadge';
import { colors, fonts, glow, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { notifySuccess, rankUpSequence } from '@/lib/haptics';
import { usePrefersReducedMotion } from '@/lib/motion';
import { useGameStore } from '@/store/gameStore';

export function CelebrationOverlay() {
  const celebration = useGameStore((s) => s.celebration);
  const clearCelebration = useGameStore((s) => s.clearCelebration);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!celebration) return;
    if (celebration.kind === 'rank' || celebration.kind === 'challenge') rankUpSequence();
    else notifySuccess();
  }, [celebration]);

  if (!celebration) return null;

  const isRank = celebration.kind === 'rank';
  const isChallenge = celebration.kind === 'challenge';
  const def = celebration.attributeKey ? resolveDef(attributeDefs, celebration.attributeKey) : null;
  const accent = isRank
    ? RANK_COLORS[celebration.rankTier!]
    : isChallenge
    ? colors.accentGold
    : def?.color ?? colors.accentCyan;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={clearCelebration}>
      <Pressable style={styles.backdrop} onPress={clearCelebration}>
        {!reducedMotion && (
          <View style={styles.stage} pointerEvents="none">
            <Shockwave color={accent} />
            <Shockwave color={accent} delay={180} />
            <ParticleBurst color={accent} />
          </View>
        )}

        <Animated.View
          entering={ZoomIn.springify().damping(11).stiffness(140)}
          style={[styles.card, { borderColor: `${accent}66` }, glow(accent, 0.35, 24)]}
        >
          {isRank ? (
            <>
              <RankBadge tier={celebration.rankTier!} size="xl" />
              <Animated.Text entering={FadeIn.delay(200)} style={[styles.eyebrow, { color: accent }]}>
                ◈ RANK UP ◈
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(320)} style={styles.title}>
                {celebration.rankTitle}
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(440)} style={styles.subtitle}>
                The System acknowledges your growth, Hunter.
              </Animated.Text>
            </>
          ) : isChallenge ? (
            <>
              <View style={[styles.levelCircle, { borderColor: accent }, glow(accent, 0.5, 16)]}>
                <Ionicons name="trophy" size={44} color={accent} />
              </View>
              <Animated.Text entering={FadeIn.delay(200)} style={[styles.eyebrow, { color: accent }]}>
                ◈ CHALLENGE COMPLETE ◈
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(320)} style={styles.title}>
                +{celebration.gems} gems
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(440)} style={styles.subtitle}>
                You beat this week's challenge. Spend them well.
              </Animated.Text>
            </>
          ) : (
            <>
              <View style={[styles.levelCircle, { borderColor: accent }, glow(accent, 0.5, 16)]}>
                <Text style={[styles.levelNumber, { color: accent }]}>{celebration.newLevel}</Text>
              </View>
              <Animated.Text entering={FadeIn.delay(200)} style={[styles.eyebrow, { color: accent }]}>
                ◈ LEVEL UP ◈
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(320)} style={styles.title}>
                {def?.name} Lv.{celebration.newLevel}
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(440)} style={styles.subtitle}>
                Earned, not given. Keep climbing.
              </Animated.Text>
            </>
          )}
          <Button onPress={clearCelebration} style={{ marginTop: spacing(6), width: '100%' }}>
            Continue
          </Button>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function Shockwave({ color, delay = 0 }: { color: string; delay?: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [t, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - t.value),
    transform: [{ scale: 0.3 + t.value * 2.4 }],
  }));

  return <Animated.View style={[styles.shockwave, { borderColor: color }, style]} />;
}

function ParticleBurst({ color }: { color: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        key: i,
        angle: (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
        dist: 100 + Math.random() * 90,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 150,
      })),
    []
  );

  return (
    <View style={styles.burst}>
      {particles.map(({ key, ...p }) => (
        <Particle key={key} {...p} color={color} />
      ))}
    </View>
  );
}

function Particle({
  angle,
  dist,
  size,
  delay,
  color,
}: {
  angle: number;
  dist: number;
  size: number;
  delay: number;
  color: string;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }));
  }, [t, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      { translateY: Math.sin(angle) * dist * t.value },
      { scale: 1 - t.value * 0.4 },
    ],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,7,13,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(6),
  },
  stage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shockwave: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing(8),
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  levelCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgBase,
  },
  levelNumber: {
    fontSize: 36,
    fontFamily: fonts.displayBlack,
  },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 4,
    marginTop: spacing(5),
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
    marginTop: spacing(2),
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing(1),
    textAlign: 'center',
  },
});
