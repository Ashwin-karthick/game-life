import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SystemMessage } from '@/components/ui/SystemMessage';
import { XPRing } from '@/components/ui/XPRing';
import { colors, fonts, spacing } from '@/constants/theme';
import { getDailyXpBuckets } from '@/lib/analytics';
import { confirmDestructive } from '@/lib/confirm';
import { xpToNextLevel } from '@/lib/progression';
import { DAILY_TEMPLATES } from '@/lib/quests';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey } from '@/types/game';

export default function AttributeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const attributeKey = id as AttributeKey;
  const def = useGameStore((s) => s.attributeDefs[attributeKey]);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);
  const state = useGameStore((s) => s.attributes[attributeKey]);
  const events = useGameStore((s) => s.events);
  const archiveArea = useGameStore((s) => s.archiveArea);

  const recentEvents = useMemo(
    () =>
      events
        .filter((e) => e.attributeKey === attributeKey && (e.type === 'xp_grant' || e.type === 'ap_grant'))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 15),
    [events, attributeKey]
  );

  const trend = useMemo(
    () => getDailyXpBuckets(events.filter((e) => e.attributeKey === attributeKey), 14),
    [events, attributeKey]
  );

  const activeCount = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived).length,
    [attributeOrder, attributeDefs]
  );

  if (!def || !state) {
    return (
      <ScreenContainer>
        <SystemMessage>Unknown attribute.</SystemMessage>
      </ScreenContainer>
    );
  }

  const toNext = xpToNextLevel(state.level, def);
  const sources = DAILY_TEMPLATES.filter((t) => t.attributeKey === attributeKey);
  const canArchive = activeCount > 3 && !def.archived;

  function onArchive() {
    confirmDestructive(
      `Archive ${def!.name}?`,
      'It disappears from your grids and pickers. All history and levels are kept.',
      'Archive',
      () => {
        archiveArea(attributeKey);
        router.back();
      }
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: def.name,
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.textPrimary,
        }}
      />

      <Animated.View entering={FadeInDown.duration(350)}>
        <Card glow={def.color} style={styles.heroCard}>
          <XPRing size={124} strokeWidth={10} progress={state.xpBuffer / toNext} color={def.color}>
            <Text style={[styles.ringLevel, { color: def.color }]}>{state.level}</Text>
            <Text style={styles.ringLabel}>LEVEL</Text>
          </XPRing>
          <View style={styles.heroInfo}>
            <View style={styles.heroTitleRow}>
              <AttributeIcon attributeKey={attributeKey} size={16} />
              <Text style={styles.name}>{def.name}</Text>
            </View>
            <Text style={styles.mutedWrap}>{def.description}</Text>
            <View style={styles.apRow}>
              <CountUp value={state.totalAP} style={[styles.apValue, { color: colors.accentGold }]} />
              <Text style={styles.muted}> AP earned</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(80)}>
        <Card style={{ marginTop: spacing(3) }}>
          <ProgressBar progress={state.xpBuffer / toNext} color={def.color} />
          <Text style={styles.muted}>
            {state.xpBuffer} / {toNext} XP to level {state.level + 1}
          </Text>
        </Card>
      </Animated.View>

      <Text style={styles.sectionTitle}>LAST 14 DAYS</Text>
      <Animated.View entering={FadeInDown.duration(350).delay(120)}>
        <Card>
          <Sparkline data={trend.map((b) => b.xp)} color={def.color} />
        </Card>
      </Animated.View>

      {sources.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>HOW TO EARN XP HERE</Text>
          <Animated.View entering={FadeInDown.duration(350).delay(160)}>
            <Card>
              {sources.map((s) => (
                <Text key={s.id} style={styles.sourceLine}>
                  ◆ {s.title} — {s.description}
                </Text>
              ))}
            </Card>
          </Animated.View>
        </>
      )}

      <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
      {recentEvents.length === 0 ? (
        <SystemMessage>No logged activity yet for {def.name}.</SystemMessage>
      ) : (
        recentEvents.map((e, i) => (
          <Animated.View key={e.id} entering={FadeInDown.duration(300).delay(200 + i * 40)}>
            <Card style={{ marginBottom: spacing(2) }}>
              <View style={styles.eventRow}>
                <Text style={styles.eventNote}>{e.note}</Text>
                <Text style={[styles.eventAmount, { color: e.type === 'ap_grant' ? colors.accentGold : def.color }]}>
                  {e.type === 'ap_grant' ? `+${e.amount} AP` : `+${e.amount} XP`}
                </Text>
              </View>
              <Text style={styles.muted}>{new Date(e.createdAt).toLocaleString()}</Text>
            </Card>
          </Animated.View>
        ))
      )}

      {canArchive && (
        <PressableScale haptic={false} style={styles.archiveRow} onPress={onArchive}>
          <Ionicons name="archive-outline" size={15} color={colors.textMuted} />
          <Text style={styles.archiveText}>Archive this area</Text>
        </PressableScale>
      )}
    </ScreenContainer>
  );
}

function Sparkline({ data, color, height = 56 }: { data: number[]; color: string; height?: number }) {
  const [width, setWidth] = useState(0);

  const path = useMemo(() => {
    if (width === 0 || data.length < 2) return '';
    const max = Math.max(1, ...data);
    const pad = 4;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * (width - pad * 2) + pad,
      y: height - pad - (v / max) * (height - pad * 2),
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${mx} ${pts[i - 1].y}, ${mx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }, [data, width, height]);

  const hasActivity = data.some((v) => v > 0);

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && hasActivity ? (
        <Svg width={width} height={height}>
          <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      ) : (
        <Text style={styles.sparkEmpty}>No activity in the last two weeks.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(5),
  },
  ringLevel: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
  },
  ringLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 2,
  },
  heroInfo: {
    flex: 1,
    gap: spacing(1),
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: fonts.heading,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  mutedWrap: {
    color: colors.textMuted,
    fontSize: 12,
  },
  apRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing(1),
  },
  apValue: {
    fontFamily: fonts.display,
    fontSize: 20,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 13,
    letterSpacing: 2,
    marginTop: spacing(6),
    marginBottom: spacing(2),
  },
  sourceLine: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing(2),
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventNote: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  eventAmount: {
    fontFamily: fonts.display,
    fontSize: 12,
  },
  sparkEmpty: {
    color: colors.textMuted,
    fontSize: 12,
  },
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    marginTop: spacing(6),
    padding: spacing(3),
  },
  archiveText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
