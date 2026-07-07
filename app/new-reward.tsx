import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { selectionTick } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';

const COST_OPTIONS = [250, 500, 1000, 2000, 4000];

export default function NewRewardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const rewards = useGameStore((s) => s.rewards);
  const addReward = useGameStore((s) => s.addReward);
  const updateReward = useGameStore((s) => s.updateReward);

  const editing = useMemo(() => (id ? rewards.find((r) => r.id === id) : undefined), [id, rewards]);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [cost, setCost] = useState(editing && COST_OPTIONS.includes(editing.cost) ? editing.cost : 500);
  const [customCost, setCustomCost] = useState(
    editing && !COST_OPTIONS.includes(editing.cost) ? String(editing.cost) : ''
  );

  const effectiveCost = customCost ? Math.max(1, parseInt(customCost, 10) || 0) : cost;

  function save() {
    if (!title.trim() || effectiveCost < 1) return;
    if (editing) updateReward(editing.id, { title: title.trim(), cost: effectiveCost });
    else addReward(title, effectiveCost);
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{editing ? 'Edit reward' : 'New reward'}</Text>
      <Text style={styles.subtitle}>Something you genuinely enjoy — you'll buy it with earned gems, guilt-free.</Text>

      <Text style={styles.label}>WHAT'S THE TREAT?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1 hour of gaming, order dessert, lazy morning"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <Text style={styles.label}>HOW MANY GEMS SHOULD IT COST?</Text>
      <View style={styles.rowWrap}>
        {COST_OPTIONS.map((c) => {
          const selected = !customCost && cost === c;
          return (
            <PressableScale
              key={c}
              onPress={() => {
                selectionTick();
                setCost(c);
                setCustomCost('');
              }}
              style={[styles.pill, selected ? styles.pillSelected : null]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : null]}>{c}</Text>
            </PressableScale>
          );
        })}
        <TextInput
          style={[styles.customInput, customCost ? styles.pillSelected : null]}
          placeholder="Custom"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={customCost}
          onChangeText={setCustomCost}
        />
      </View>
      <Text style={styles.hint}>Rule of thumb: a day of solid effort earns roughly 300–800 gems.</Text>

      <View style={styles.row}>
        <Button variant="ghost" onPress={() => router.back()} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onPress={save} disabled={!title.trim() || effectiveCost < 1} style={{ flex: 1 }}>
          {editing ? 'Save changes' : 'Save'}
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
    alignItems: 'center',
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
  customInput: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    color: colors.textPrimary,
    fontSize: 13,
    backgroundColor: colors.bgSurface,
    minWidth: 90,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(2),
  },
  row: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(6),
  },
});
