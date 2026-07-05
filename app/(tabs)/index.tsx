import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RankBadge } from '@/components/ui/RankBadge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SystemMessage } from '@/components/ui/SystemMessage';
import { XPRing } from '@/components/ui/XPRing';
import { colors, fonts, glow, gradients, radius, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { buildBriefing } from '@/lib/economy';
import { computeHunterRank, todayLocalDateString, xpToNextLevel } from '@/lib/progression';
import { selectTotalAP, useGameStore } from '@/store/gameStore';

export default function HomeScreen() {
  const profile = useGameStore((s) => s.profile);
  const attributes = useGameStore((s) => s.attributes);
  const streak = useGameStore((s) => s.streak);
  const events = useGameStore((s) => s.events);
  const quests = useGameStore((s) => s.quests);
  const wallet = useGameStore((s) => s.wallet);
  const dailies = useGameStore((s) => s.dailies);
  const challenge = useGameStore((s) => s.challenge);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);
  const totalAP = useGameStore(selectTotalAP);
  const rank = useMemo(() => computeHunterRank(totalAP), [totalAP]);

  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived && attributes[k]),
    [attributeOrder, attributeDefs, attributes]
  );

  const today = todayLocalDateString(Date.now());
  const todaysXp = useMemo(
    () =>
      events
        .filter((e) => e.type === 'xp_grant' && todayLocalDateString(e.createdAt) === today)
        .reduce((sum, e) => sum + e.amount, 0),
    [events, today]
  );
  const activeToday = streak.lastActiveDate === today;

  const rankProgress =
    rank.nextThreshold === null
      ? 1
      : (rank.totalAP - rank.currentMin) / (rank.nextThreshold - rank.currentMin);

  const suggestedQuests = useMemo(
    () => quests.filter((q) => q.state === 'available' || q.state === 'active').slice(0, 3),
    [quests]
  );

  const briefing = useMemo(() => {
    const todayWeekday = new Date().getDay();
    const liveDailies = dailies.filter((d) => !d.archived && d.weekdays.includes(todayWeekday));
    const remaining = liveDailies.filter((d) => !d.completedDates.includes(today)).length;
    const weakestKey = [...activeKeys].sort((a, b) => {
      if (attributes[a].level !== attributes[b].level) return attributes[a].level - attributes[b].level;
      return (attributes[a].lastActionAt ?? 0) - (attributes[b].lastActionAt ?? 0);
    })[0];
    return buildBriefing({
      now: Date.now(),
      name: profile?.name ?? 'Hunter',
      streakLen: streak.currentLen,
      activeToday,
      weakestAttributeName: weakestKey ? resolveDef(attributeDefs, weakestKey).name : null,
      challenge,
      dailiesRemaining: remaining,
      dailiesTotal: liveDailies.length,
    });
  }, [dailies, attributes, profile, streak.currentLen, activeToday, challenge, today, activeKeys, attributeDefs]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>WELCOME BACK</Text>
            <Text style={styles.name}>{profile?.name ?? 'Hunter'}</Text>
          </View>
          <View style={styles.headerRight}>
            <PressableScale style={styles.gemChip} onPress={() => router.push('/shop')}>
              <Ionicons name="diamond" size={14} color={colors.accentCyan} />
              <CountUp value={wallet.gems} style={styles.gemText} />
            </PressableScale>
            <RankBadge tier={rank.tier} size="md" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <LinearGradient
            colors={gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, glow(colors.accentViolet, 0.25, 20)]}
          >
            <HeroShimmer />
            <View style={styles.heroRow}>
              <XPRing size={116} strokeWidth={9} progress={rankProgress} color={colors.accentGold}>
                <Text style={styles.ringTier}>{rank.tier}</Text>
                <Text style={styles.ringLabel}>RANK</Text>
              </XPRing>

              <View style={{ flex: 1, gap: spacing(3) }}>
                <View>
                  <Text style={styles.heroLabel}>HUNTER RANK</Text>
                  <Text style={styles.heroTitle}>{rank.title}</Text>
                </View>
                <View>
                  <Text style={styles.heroLabel}>TODAY'S XP</Text>
                  <CountUp value={Math.round(todaysXp)} prefix="+" style={styles.heroXp} />
                </View>
              </View>
            </View>

            {rank.nextThreshold !== null && (
              <Text style={styles.heroToNext}>
                {rank.nextThreshold - rank.totalAP} AP to {rank.tier === 'A' ? 'S' : 'next'} rank
              </Text>
            )}

            <View style={styles.streakRow}>
              <StreakFlame active={streak.currentLen > 0} />
              <Text style={styles.streakText}>{streak.currentLen}-day streak</Text>
              {!activeToday && streak.currentLen > 0 && (
                <Text style={styles.streakWarn}>· log today to keep it alive</Text>
              )}
              {streak.freezeTokens > 0 && (
                <Text style={styles.smallMuted}>
                  · {streak.freezeTokens} freeze{streak.freezeTokens > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(120)}>
          <Card style={{ marginTop: spacing(4) }}>
            <Text style={styles.briefingHeader}>{briefing.greeting}, {profile?.name ?? 'Hunter'}.</Text>
            {briefing.lines.map((line, i) => (
              <View key={i} style={styles.briefingRow}>
                <Ionicons
                  name={line.icon as any}
                  size={14}
                  color={line.tone === 'good' ? colors.success : line.tone === 'warn' ? colors.warning : colors.textMuted}
                />
                <Text style={styles.briefingText}>{line.text}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        {challenge && (
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <PressableScale onPress={() => router.push('/shop')}>
              <Card style={{ marginTop: spacing(3) }} glow={challenge.state === 'cleared' ? colors.accentGold : undefined}>
                <View style={styles.challengeHeader}>
                  <Ionicons name="trophy" size={16} color={colors.accentGold} />
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  {challenge.state === 'cleared' ? (
                    <Text style={styles.challengeCleared}>CLEARED ✓</Text>
                  ) : (
                    <Text style={styles.challengeReward}>
                      <Ionicons name="diamond" size={11} color={colors.accentCyan} /> {challenge.gemReward}
                    </Text>
                  )}
                </View>
                <View style={{ marginTop: spacing(2) }}>
                  <ProgressBar
                    progress={challenge.progressXp / challenge.targetXp}
                    color={colors.accentGold}
                    height={8}
                  />
                  <Text style={styles.smallMuted}>
                    {challenge.state === 'cleared'
                      ? `Done — +${challenge.gemReward} gems earned. New challenge next week.`
                      : `${Math.round(challenge.progressXp)} / ${challenge.targetXp} XP this week`}
                  </Text>
                </View>
              </Card>
            </PressableScale>
          </Animated.View>
        )}

        <Text style={styles.sectionTitle}>ATTRIBUTES</Text>
        <View style={styles.attrGrid}>
          {activeKeys.map((key, i) => {
            const def = resolveDef(attributeDefs, key);
            const state = attributes[key];
            const toNext = xpToNextLevel(state.level, def);
            return (
              <Animated.View key={key} entering={FadeInDown.duration(350).delay(120 + i * 55)} style={styles.attrWrap}>
                <PressableScale style={styles.attrTile} onPress={() => router.push(`/attribute/${key}`)}>
                  <View style={styles.attrTileHeader}>
                    <AttributeIcon attributeKey={key} size={14} />
                    <Text style={[styles.attrLevel, { color: def.color }]}>Lv.{state.level}</Text>
                  </View>
                  <Text style={styles.attrName}>{def.name}</Text>
                  <ProgressBar progress={state.xpBuffer / toNext} color={def.color} height={6} />
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>SUGGESTED QUESTS</Text>
        {suggestedQuests.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(350).delay(400)}>
            <SystemMessage>No quests detected, Hunter.{'\n'}Open Quests to refresh your offers.</SystemMessage>
          </Animated.View>
        ) : (
          suggestedQuests.map((q, i) => {
            const def = resolveDef(attributeDefs, q.attributeKey);
            return (
              <Animated.View key={q.id} entering={FadeInDown.duration(350).delay(420 + i * 70)}>
                <PressableScale onPress={() => router.push(`/quest/${q.id}`)}>
                  <Card style={{ marginBottom: spacing(3) }}>
                    <View style={styles.questRow}>
                      <AttributeIcon attributeKey={q.attributeKey} size={16} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.questTitle}>{q.title}</Text>
                        <Text style={styles.smallMuted}>{q.rationale}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={def.color} />
                    </View>
                  </Card>
                </PressableScale>
              </Animated.View>
            );
          })
        )}
      </ScreenContainer>

      <PulsingFab onPress={() => router.push('/quick-log')} />
    </View>
  );
}

function HeroShimmer() {
  const t = useSharedValue(0);

  useEffect(() => {
    // A soft light stripe sweeps across the hero card every few seconds.
    t.value = withRepeat(
      withSequence(
        withDelay(2600, withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) })),
        withTiming(0, { duration: 16 })
      ),
      -1
    );
  }, [t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 0.6,
    transform: [{ translateX: -140 + t.value * 620 }, { rotate: '18deg' }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.shimmer, style]} />;
}

function StreakFlame({ active }: { active: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1
      );
    }
  }, [active, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Ionicons name="flame" size={18} color={active ? colors.warning : colors.textMuted} />
    </Animated.View>
  );
}

function PulsingFab({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })),
      -1
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      <Animated.View style={[styles.fabHalo, haloStyle]} pointerEvents="none" />
      <PressableScale
        style={[styles.fab, glow(colors.accentCyan, 0.6, 14)]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Log an action"
      >
        <LinearGradient colors={gradients.cyan} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
          <Ionicons name="add" size={30} color={colors.bgBase} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  gemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: `${colors.accentCyan}44`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  gemText: {
    color: colors.accentCyan,
    fontFamily: fonts.display,
    fontSize: 13,
  },
  briefingHeader: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 16,
    marginBottom: spacing(2),
  },
  briefingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(1),
  },
  briefingText: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  challengeTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 15,
    flex: 1,
  },
  challengeCleared: {
    color: colors.accentGold,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1,
  },
  challengeReward: {
    color: colors.accentCyan,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  greeting: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
    marginTop: 2,
  },
  hero: {
    marginTop: spacing(4),
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: spacing(5),
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: 56,
    height: 320,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(5),
  },
  ringTier: {
    color: colors.accentGold,
    fontFamily: fonts.displayBlack,
    fontSize: 34,
  },
  ringLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 9,
    letterSpacing: 2,
  },
  heroLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 20,
  },
  heroXp: {
    color: colors.accentCyan,
    fontFamily: fonts.display,
    fontSize: 22,
  },
  heroToNext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(3),
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(3),
  },
  streakText: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  streakWarn: {
    color: colors.warning,
    fontSize: 12,
  },
  smallMuted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 13,
    letterSpacing: 2,
    marginTop: spacing(6),
    marginBottom: spacing(3),
  },
  attrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(3),
  },
  attrWrap: {
    width: '47%',
  },
  attrTile: {
    backgroundColor: colors.bgSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: spacing(3),
    gap: spacing(2),
  },
  attrTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attrLevel: {
    fontFamily: fonts.display,
    fontSize: 11,
  },
  attrName: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  questTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  fabWrap: {
    position: 'absolute',
    right: spacing(5),
    bottom: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabHalo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentCyan,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  fabInner: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
