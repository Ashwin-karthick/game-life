import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { selectionTick } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey, Difficulty, HabitPolarity } from '@/types/game';

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'trivial', label: 'Tiny' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'epic', label: 'Huge' },
];

const WEEKDAYS = [
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
  { day: 0, label: 'S' },
];

export default function NewTaskScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: 'habit' | 'daily'; id?: string }>();
  const isHabit = kind === 'habit';

  const habits = useGameStore((s) => s.habits);
  const dailies = useGameStore((s) => s.dailies);
  const addHabit = useGameStore((s) => s.addHabit);
  const addDaily = useGameStore((s) => s.addDaily);
  const updateHabit = useGameStore((s) => s.updateHabit);
  const updateDaily = useGameStore((s) => s.updateDaily);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);

  const editingHabit = useMemo(() => (isHabit && id ? habits.find((h) => h.id === id) : undefined), [isHabit, id, habits]);
  const editingDaily = useMemo(() => (!isHabit && id ? dailies.find((d) => d.id === id) : undefined), [isHabit, id, dailies]);
  const isEdit = Boolean(editingHabit || editingDaily);

  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived),
    [attributeOrder, attributeDefs]
  );

  const [title, setTitle] = useState(editingHabit?.title ?? editingDaily?.title ?? '');
  const [polarity, setPolarity] = useState<HabitPolarity>(editingHabit?.polarity ?? 'good');
  const [attributeKey, setAttributeKey] = useState<AttributeKey>(
    editingHabit?.attributeKey ?? editingDaily?.attributeKey ?? activeKeys[0] ?? 'health'
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(editingHabit?.difficulty ?? editingDaily?.difficulty ?? 'easy');
  const [weekdays, setWeekdays] = useState<number[]>(editingDaily?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);

  function toggleWeekday(day: number) {
    selectionTick();
    setWeekdays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // at least one day
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  }

  function save() {
    if (!title.trim()) return;
    if (isHabit) {
      if (editingHabit) updateHabit(editingHabit.id, { title: title.trim(), polarity, attributeKey, difficulty });
      else addHabit(title, polarity, attributeKey, difficulty);
    } else {
      if (editingDaily) updateDaily(editingDaily.id, { title: title.trim(), attributeKey, difficulty, weekdays });
      else addDaily(title, attributeKey, difficulty, weekdays);
    }
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>
        {isEdit ? (isHabit ? 'Edit habit' : 'Edit daily') : isHabit ? 'New habit' : 'New daily'}
      </Text>
      <Text style={styles.subtitle}>
        {isHabit
          ? 'Something you want to do more — or less — of.'
          : 'Something you do on the days you choose. Missing a scheduled day costs XP.'}
      </Text>

      <Text style={styles.label}>WHAT IS IT?</Text>
      <TextInput
        style={styles.input}
        placeholder={isHabit ? 'e.g. Drink water, Skip late-night snacks' : 'e.g. Morning stretch'}
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        autoFocus={!isEdit}
      />

      {isHabit && (
        <>
          <Text style={styles.label}>WHICH DIRECTION?</Text>
          <View style={styles.rowWrap}>
            <PressableScale
              onPress={() => {
                selectionTick();
                setPolarity('good');
              }}
              style={[styles.polarityTile, polarity === 'good' ? { borderColor: colors.success, backgroundColor: `${colors.success}15` } : null]}
            >
              <Text style={[styles.polarityTitle, polarity === 'good' ? { color: colors.success } : null]}>Do more of it</Text>
              <Text style={styles.polarityDesc}>Earns XP every time you log it</Text>
            </PressableScale>
            <PressableScale
              onPress={() => {
                selectionTick();
                setPolarity('bad');
              }}
              style={[styles.polarityTile, polarity === 'bad' ? { borderColor: colors.danger, backgroundColor: `${colors.danger}15` } : null]}
            >
              <Text style={[styles.polarityTitle, polarity === 'bad' ? { color: colors.danger } : null]}>Do less of it</Text>
              <Text style={styles.polarityDesc}>Log slips honestly; costs a little XP</Text>
            </PressableScale>
          </View>
        </>
      )}

      {!isHabit && (
        <>
          <Text style={styles.label}>WHICH DAYS?</Text>
          <View style={styles.rowWrap}>
            {WEEKDAYS.map((w) => {
              const selected = weekdays.includes(w.day);
              return (
                <PressableScale
                  key={w.day}
                  scaleTo={0.85}
                  onPress={() => toggleWeekday(w.day)}
                  style={[styles.dayPill, selected ? styles.dayPillSelected : null]}
                >
                  <Text style={[styles.dayPillText, selected ? styles.dayPillTextSelected : null]}>{w.label}</Text>
                </PressableScale>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {weekdays.length === 7 ? 'Every day.' : `${weekdays.length} day${weekdays.length > 1 ? 's' : ''} a week — no penalty on off-days.`}
          </Text>
        </>
      )}

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

      <View style={styles.row}>
        <Button variant="ghost" onPress={() => router.back()} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onPress={save} disabled={!title.trim()} style={{ flex: 1 }}>
          {isEdit ? 'Save changes' : 'Save'}
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
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  polarityTile: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.md,
    padding: spacing(3),
    backgroundColor: colors.bgSurface,
    gap: 2,
  },
  polarityTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  polarityDesc: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    borderColor: colors.accentCyan,
    backgroundColor: `${colors.accentCyan}22`,
  },
  dayPillText: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  dayPillTextSelected: {
    color: colors.accentCyan,
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
    fontSize: 12,
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
