import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { XPRing } from '@/components/ui/XPRing';
import { colors, fonts, spacing } from '@/constants/theme';
import { computeBalanceIndex, DayBucket, getActivityHeatmap, getDailyXpBuckets } from '@/lib/analytics';
import { resolveDef } from '@/lib/attributes';
import { useGameStore } from '@/store/gameStore';

export default function AnalyticsScreen() {
  const events = useGameStore((s) => s.events);
  const attributes = useGameStore((s) => s.attributes);
  const streak = useGameStore((s) => s.streak);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);

  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived && attributes[k]),
    [attributeOrder, attributeDefs, attributes]
  );
  const weekBuckets = useMemo(() => getDailyXpBuckets(events, 7), [events]);
  const heatmap = useMemo(() => getActivityHeatmap(events, 35), [events]);
  const balanceIndex = useMemo(() => computeBalanceIndex(attributes, activeKeys), [attributes, activeKeys]);

  const weekTotal = Math.round(weekBuckets.reduce((sum, b) => sum + b.xp, 0));
  const activeDays = weekBuckets.filter((b) => b.active).length;
  const totalAttrLevels = activeKeys.reduce((sum, k) => sum + attributes[k].level, 0);
  const maxHeat = Math.max(1, ...heatmap.map((d) => d.xp));

  return (
    <ScreenContainer>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Honest proof of progress.</Text>

      <Animated.View entering={FadeInDown.duration(350)}>
        <Card>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <CountUp value={weekTotal} style={[styles.summaryValue, { color: colors.accentCyan }]} />
              <Text style={styles.summaryLabel}>XP THIS WEEK</Text>
            </View>
            <View style={styles.summaryItem}>
              <CountUp value={activeDays} suffix="/7" style={[styles.summaryValue, { color: colors.success }]} />
              <Text style={styles.summaryLabel}>ACTIVE DAYS</Text>
            </View>
            <View style={styles.summaryItem}>
              <CountUp value={streak.longestLen} style={[styles.summaryValue, { color: colors.accentGold }]} />
              <Text style={styles.summaryLabel}>BEST STREAK</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(70)}>
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.sectionLabel}>LAST 7 DAYS · XP</Text>
          <AreaChart data={weekBuckets} color={colors.accentCyan} />
          <View style={styles.dayLabels}>
            {weekBuckets.map((b) => (
              <Text key={b.date} style={styles.dayLabel}>
                {b.label[0]}
              </Text>
            ))}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(140)}>
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.sectionLabel}>LAST 5 WEEKS · ACTIVITY</Text>
          <View style={styles.heatGrid}>
            {heatmap.map((d) => (
              <View
                key={d.date}
                style={[
                  styles.heatCell,
                  d.active
                    ? { backgroundColor: colors.accentCyan, opacity: 0.3 + 0.7 * (d.xp / maxHeat) }
                    : { backgroundColor: colors.bgSurfaceRaised },
                ]}
              />
            ))}
          </View>
          <Text style={styles.muted}>Longest streak: {streak.longestLen} days</Text>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(210)}>
        <Card style={{ marginTop: spacing(4) }}>
          <View style={styles.balanceRow}>
            <XPRing size={90} strokeWidth={8} progress={balanceIndex / 100} color={colors.accentViolet}>
              <CountUp value={balanceIndex} style={styles.balanceValue} />
            </XPRing>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>BALANCE INDEX</Text>
              <Text style={styles.mutedWrap}>
                How evenly your {activeKeys.length} areas have grown. A specialist scores low; a well-rounded Hunter
                scores high.
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(280)}>
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.sectionLabel}>ATTRIBUTE BREAKDOWN</Text>
          {activeKeys.map((key) => {
            const def = resolveDef(attributeDefs, key);
            const state = attributes[key];
            const share = totalAttrLevels === 0 ? 0 : state.level / totalAttrLevels;
            return (
              <View key={key} style={styles.attrRow}>
                <Text style={styles.attrName}>{def.name}</Text>
                <View style={{ flex: 1, marginHorizontal: spacing(3) }}>
                  <ProgressBar progress={share} color={def.color} height={6} />
                </View>
                <Text style={styles.muted}>Lv.{state.level}</Text>
              </View>
            );
          })}
        </Card>
      </Animated.View>
    </ScreenContainer>
  );
}

function AreaChart({ data, color, height = 130 }: { data: DayBucket[]; color: string; height?: number }) {
  const [width, setWidth] = useState(0);

  const { linePath, fillPath, points } = useMemo(() => {
    if (width === 0 || data.length < 2) return { linePath: '', fillPath: '', points: [] as { x: number; y: number; active: boolean }[] };
    const max = Math.max(1, ...data.map((d) => d.xp));
    const pad = 8;
    const pts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * (width - pad * 2) + pad,
      y: height - pad - (d.xp / max) * (height - pad * 2),
      active: d.active,
    }));
    let line = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2;
      line += ` C ${mx} ${pts[i - 1].y}, ${mx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    const fill = `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
    return { linePath: line, fillPath: fill, points: pts };
  }, [data, width, height]);

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.35" />
              <Stop offset="1" stopColor={color} stopOpacity="0.02" />
            </SvgLinearGradient>
          </Defs>
          <Path d={fillPath} fill="url(#areaFill)" />
          <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.active ? 4 : 2.5}
              fill={p.active ? color : colors.bgSurfaceRaised}
              stroke={color}
              strokeWidth={p.active ? 0 : 1}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing(5),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    textAlign: 'center',
  },
  summaryLabel: {
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
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(2),
  },
  mutedWrap: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: spacing(1),
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    width: 14,
    textAlign: 'center',
  },
  heatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatCell: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },
  balanceValue: {
    color: colors.accentViolet,
    fontFamily: fonts.display,
    fontSize: 22,
    textAlign: 'center',
  },
  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  attrName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    width: 90,
  },
});
