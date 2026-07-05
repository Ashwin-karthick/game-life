import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { notifySuccess, selectionTick } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey, Difficulty } from '@/types/game';

const DAY_MS = 24 * 60 * 60 * 1000;

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'trivial', label: 'Tiny' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'epic', label: 'Huge' },
];

const STEP_OPTIONS = [1, 2, 3, 5, 7, 10];

const DEADLINE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'No deadline', days: null },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export default function NewQuestScreen() {
  const addQuest = useGameStore((s) => s.addQuest);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);

  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived),
    [attributeOrder, attributeDefs]
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attributeKey, setAttributeKey] = useState<AttributeKey>(activeKeys[0] ?? 'health');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [steps, setSteps] = useState(1);
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null);

  function save() {
    if (!title.trim()) return;
    addQuest(
      title,
      description,
      attributeKey,
      difficulty,
      steps,
      deadlineDays === null ? null : Date.now() + deadlineDays * DAY_MS
    );
    notifySuccess();
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>New quest</Text>
      <Text style={styles.subtitle}>A goal you set for yourself. It starts active right away.</Text>

      <Text style={styles.label}>WHAT'S THE GOAL?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Read 5 books, Run a 10k, Declutter the garage"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <Text style={styles.label}>DETAILS (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { minHeight: 60 }]}
        placeholder="Anything worth remembering about it"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>HOW MANY STEPS?</Text>
      <View style={styles.rowWrap}>
        {STEP_OPTIONS.map((n) => {
          const selected = steps === n;
          return (
            <PressableScale
              key={n}
              onPress={() => {
                selectionTick();
                setSteps(n);
              }}
              style={[styles.pill, selected ? styles.pillSelected : null]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : null]}>{n === 1 ? 'One-time' : `${n} steps`}</Text>
            </PressableScale>
          );
        })}
      </View>
      {steps > 1 && <Text style={styles.hint}>Each step pays out its share of the XP as you go.</Text>}

      <Text style={styles.label}>WHICH AREA OF LIFE?</Text>
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

      <Text style={styles.label}>HOW MUCH EFFORT?</Text>
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

      <Text style={styles.label}>DEADLINE?</Text>
      <View style={styles.rowWrap}>
        {DEADLINE_OPTIONS.map((opt) => {
          const selected = deadlineDays === opt.days;
          return (
            <PressableScale
              key={opt.label}
              onPress={() => {
                selectionTick();
                setDeadlineDays(opt.days);
              }}
              style={[styles.pill, selected ? styles.pillSelected : null]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : null]}>{opt.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.row}>
        <Button variant="ghost" onPress={() => router.back()} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onPress={save} disabled={!title.trim()} style={{ flex: 1 }}>
          Start quest
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
  input: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.md,
    padding: spacing(3),
    color: colors.textPrimary,
    fontSize: 15,
    backgroundColor: colors.bgSurface,
    textAlignVertical: 'top',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(2),
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
  row: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(6),
  },
});
