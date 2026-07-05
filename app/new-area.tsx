import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, glow, radius, spacing } from '@/constants/theme';
import { AREA_COLOR_CHOICES, AREA_ICON_CHOICES } from '@/lib/attributes';
import { notifySuccess, selectionTick } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';

export default function NewAreaScreen() {
  const addArea = useGameStore((s) => s.addArea);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(AREA_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(AREA_COLOR_CHOICES[5]);

  function save() {
    if (!name.trim()) return;
    if (addArea(name, icon, color)) {
      notifySuccess();
      router.back();
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>New life area</Text>
      <Text style={styles.subtitle}>Track anything that matters to you — it levels up like everything else.</Text>

      <Text style={styles.label}>NAME IT</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Spirituality, Side Project, Music"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        autoFocus
        maxLength={20}
      />

      <Text style={styles.label}>PICK AN ICON</Text>
      <View style={styles.grid}>
        {AREA_ICON_CHOICES.map((ic) => {
          const selected = icon === ic;
          return (
            <PressableScale
              key={ic}
              onPress={() => {
                selectionTick();
                setIcon(ic);
              }}
              style={[styles.iconTile, selected ? { borderColor: color, backgroundColor: `${color}18` } : null]}
            >
              <Ionicons name={ic as any} size={20} color={selected ? color : colors.textMuted} />
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.label}>PICK A COLOR</Text>
      <View style={styles.grid}>
        {AREA_COLOR_CHOICES.map((c) => {
          const selected = color === c;
          return (
            <PressableScale
              key={c}
              scaleTo={0.85}
              onPress={() => {
                selectionTick();
                setColor(c);
              }}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                selected ? [{ borderColor: colors.textPrimary }, glow(c, 0.6, 10)] : null,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.previewRow}>
        <View style={[styles.previewIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={[styles.previewName, { color }]}>{name.trim() || 'Your new area'}</Text>
        <Text style={styles.previewLevel}>Lv.1</Text>
      </View>

      <View style={styles.row}>
        <Button variant="ghost" onPress={() => router.back()} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onPress={save} disabled={!name.trim()} style={{ flex: 1 }}>
          Create
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    marginTop: spacing(6),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.lg,
    padding: spacing(4),
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontFamily: fonts.heading,
    fontSize: 17,
    flex: 1,
  },
  previewLevel: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(6),
  },
});
