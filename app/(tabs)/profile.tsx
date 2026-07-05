import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CountUp } from '@/components/ui/CountUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { RankBadge } from '@/components/ui/RankBadge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, glow, gradients, radius, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { computeHunterRank } from '@/lib/progression';
import { computeBadges } from '@/lib/titles';
import { selectTotalAP, useGameStore } from '@/store/gameStore';

export default function ProfileScreen() {
  const profile = useGameStore((s) => s.profile);
  const events = useGameStore((s) => s.events);
  const streak = useGameStore((s) => s.streak);
  const quests = useGameStore((s) => s.quests);
  const totalAP = useGameStore(selectTotalAP);
  const rank = useMemo(() => computeHunterRank(totalAP), [totalAP]);

  const habits = useGameStore((s) => s.habits);
  const inventory = useGameStore((s) => s.inventory);
  const attributeDefs = useGameStore((s) => s.attributeDefs);

  const completedQuests = useMemo(() => quests.filter((q) => q.state === 'completed'), [quests]);
  const actionsLogged = useMemo(() => events.filter((e) => e.type === 'xp_grant').length, [events]);

  const badges = useMemo(
    () =>
      computeBadges({
        totalEventsLogged: actionsLogged,
        anyLevelUps: events.some((e) => e.type === 'ap_grant'),
        longestStreak: streak.longestLen,
        hunterRankTier: rank.tier,
        completedQuests,
        habitsLogged: habits.reduce((sum, h) => sum + h.totalLogs, 0),
        dailiesCompleted: events.filter((e) => e.type === 'xp_grant' && e.note.startsWith('Daily:')).length,
        rewardsRedeemed: events.filter((e) => e.type === 'reward_redeem').length,
        challengesCleared: events.filter((e) => e.type === 'challenge_clear').length,
        legendaryItemsFound: inventory.filter((i) => i.rarity === 'legendary').length,
      }),
    [events, streak, rank, completedQuests, actionsLogged, habits, inventory]
  );
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <ScreenContainer>
      <Animated.View entering={FadeInDown.duration(400)}>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, glow(colors.accentViolet, 0.2, 18)]}
        >
          <RankBadge tier={rank.tier} size="lg" />
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.rankTitle}>{rank.title.toUpperCase()}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <CountUp value={totalAP} style={[styles.statValue, { color: colors.accentGold }]} />
              <Text style={styles.statLabel}>TOTAL AP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <CountUp value={actionsLogged} style={[styles.statValue, { color: colors.accentCyan }]} />
              <Text style={styles.statLabel}>ACTIONS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <CountUp value={completedQuests.length} style={[styles.statValue, { color: colors.success }]} />
              <Text style={styles.statLabel}>QUESTS</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(90)}>
        <Card style={{ marginTop: spacing(5) }}>
          <Text style={styles.sectionLabel}>FOCUS DOMAINS</Text>
          <View style={styles.chipRow}>
            {profile?.focusDomains.map((key) => (
              <Chip key={key} label={resolveDef(attributeDefs, key).name} color={resolveDef(attributeDefs, key).color} />
            ))}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(160)}>
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.sectionLabel}>
            ACHIEVEMENTS ({earnedCount}/{badges.length})
          </Text>
          <View style={styles.badgeGrid}>
            {badges.map((b) => (
              <View key={b.key} style={[styles.badgeTile, !b.earned ? styles.badgeLocked : null]}>
                <View style={[styles.badgeIcon, b.earned ? { backgroundColor: `${colors.accentGold}22` } : null]}>
                  <Ionicons
                    name={b.earned ? (b.icon as any) : 'lock-closed'}
                    size={16}
                    color={b.earned ? colors.accentGold : colors.textMuted}
                  />
                </View>
                <Text style={[styles.badgeName, !b.earned ? { color: colors.textMuted } : null]} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {b.description}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(230)} style={{ marginTop: spacing(5), gap: spacing(3) }}>
        <LinkRow icon="gift" label="Reward Shop" onPress={() => router.push('/shop')} />
        <LinkRow icon="star" label="Perks" onPress={() => router.push('/perks')} />
        <LinkRow icon="book" label="Journal" onPress={() => router.push('/journal')} />
        <LinkRow icon="notifications" label="Daily Reminder" onPress={() => router.push('/notifications')} />
        <LinkRow icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </Animated.View>
    </ScreenContainer>
  );
}

function LinkRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.linkRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.textPrimary} />
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    gap: spacing(2),
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: spacing(6),
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: fonts.heading,
    marginTop: spacing(2),
  },
  rankTitle: {
    color: colors.accentGold,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    marginTop: spacing(5),
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderGlass,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    textAlign: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: spacing(3),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  badgeTile: {
    width: '31%',
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing(2),
  },
  badgeLocked: {
    opacity: 0.55,
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bgSurfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 11,
    textAlign: 'center',
  },
  badgeDesc: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: 12,
    padding: spacing(4),
  },
  linkText: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 15,
    flex: 1,
  },
});
