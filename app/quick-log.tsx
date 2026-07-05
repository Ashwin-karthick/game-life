import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, glow, radius, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { selectionTick } from '@/lib/haptics';
import { baseActionXp, streakMultiplier } from '@/lib/progression';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey, Difficulty } from '@/types/game';

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'trivial', label: 'Trivial' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'epic', label: 'Epic' },
];

const MINUTE_OPTIONS = [10, 20, 30, 45, 60, 90];

export default function QuickLogScreen() {
  const logAction = useGameStore((s) => s.logAction);
  const streak = useGameStore((s) => s.streak);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);
  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived),
    [attributeOrder, attributeDefs]
  );
  const [attributeKey, setAttributeKey] = useState<AttributeKey>(activeKeys[0] ?? 'health');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState('');

  const estimatedXp = useMemo(
    () => Math.round(baseActionXp(difficulty, minutes) * streakMultiplier(streak.currentLen)),
    [difficulty, minutes, streak.currentLen]
  );
  const selectedDef = resolveDef(attributeDefs, attributeKey);

  function submit() {
    logAction(attributeKey, difficulty, minutes, note);
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Log an action</Text>
      <Text style={styles.subtitle}>Real effort, honestly recorded.</Text>

      <Text style={styles.label}>WHICH ATTRIBUTE?</Text>
      <View style={styles.attrGrid}>
        {activeKeys.map((key) => {
          const def = resolveDef(attributeDefs, key);
          const selected = attributeKey === key;
          return (
            <PressableScale
              key={key}
              onPress={() => {
                selectionTick();
                setAttributeKey(key);
              }}
              style={[styles.attrTile, selected ? { borderColor: def.color, backgroundColor: `${def.color}18` } : null]}
            >
              <AttributeIcon attributeKey={key} size={16} />
              <Text style={[styles.attrLabel, selected ? { color: def.color } : null]}>{def.name}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.label}>HOW HARD WAS IT?</Text>
      <View style={styles.rowWrap}>
        {DIFFICULTIES.map((d) => {
          const selected = difficulty === d.key;
          return (
            <PressableScale
              key={d.key}
              onPress={() => {
                selectionTick();
                setDifficulty(d.key);
              }}
              style={[styles.pill, selected ? styles.pillSelected : null]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : null]}>{d.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.label}>HOW LONG?</Text>
      <View style={styles.rowWrap}>
        {MINUTE_OPTIONS.map((m) => {
          const selected = minutes === m;
          return (
            <PressableScale
              key={m}
              onPress={() => {
                selectionTick();
                setMinutes(m);
              }}
              style={[styles.pill, selected ? styles.pillSelected : null]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : null]}>{m}m</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="What did you do?"
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
        multiline
      />

      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.previewCard, { borderColor: `${selectedDef.color}66` }, glow(selectedDef.color, 0.25, 12)]}
      >
        <Ionicons name="flash" size={18} color={selectedDef.color} />
        <View style={{ flex: 1 }}>
          <Text style={styles.previewLabel}>ESTIMATED REWARD</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <CountUp value={estimatedXp} prefix="+" duration={400} style={[styles.previewXp, { color: selectedDef.color }]} />
            <Text style={[styles.previewXpUnit, { color: selectedDef.color }]}> XP · {selectedDef.name}</Text>
          </View>
        </View>
        {streak.currentLen > 0 && (
          <View style={styles.multiplierBadge}>
            <Ionicons name="flame" size={12} color={colors.warning} />
            <Text style={styles.multiplierText}>×{streakMultiplier(streak.currentLen).toFixed(2)}</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.row}>
        <Button variant="ghost" onPress={() => router.back()} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onPress={submit} style={{ flex: 1 }}>
          Log it
        </Button>
      </View>
    </ScreenContainer>
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
    marginBottom: spacing(4),
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: spacing(4),
    marginBottom: spacing(2),
  },
  attrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  attrTile: {
    width: '31%',
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.md,
    padding: spacing(2),
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.bgSurface,
  },
  attrLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  pill: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    backgroundColor: colors.bgSurface,
  },
  pillSelected: {
    borderColor: colors.accentCyan,
    backgroundColor: `${colors.accentCyan}22`,
  },
  pillText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  pillTextSelected: {
    color: colors.accentCyan,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.md,
    padding: spacing(3),
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 70,
    backgroundColor: colors.bgSurface,
    textAlignVertical: 'top',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    marginTop: spacing(5),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
  },
  previewLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  previewXp: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  previewXpUnit: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.warning}18`,
    borderWidth: 1,
    borderColor: `${colors.warning}55`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
  },
  multiplierText: {
    color: colors.warning,
    fontFamily: fonts.heading,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(5),
  },
});
