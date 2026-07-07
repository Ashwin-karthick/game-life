import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { XPRing } from '@/components/ui/XPRing';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { MAX_AREAS, resolveDef } from '@/lib/attributes';
import { xpToNextLevel } from '@/lib/progression';
import { useGameStore } from '@/store/gameStore';

export default function AttributesScreen() {
  const attributes = useGameStore((s) => s.attributes);
  const profile = useGameStore((s) => s.profile);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);

  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived && attributes[k]),
    [attributeOrder, attributeDefs, attributes]
  );
  const canAdd = activeKeys.length < MAX_AREAS;

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Attributes</Text>
          <Text style={styles.subtitle}>Your character sheet — every bar here is earned.</Text>
        </View>
        {canAdd && (
          <PressableScale style={styles.addBtn} onPress={() => router.push('/new-area')}>
            <Ionicons name="add" size={16} color={colors.accentCyan} />
            <Text style={styles.addBtnText}>New area</Text>
          </PressableScale>
        )}
      </View>

      {activeKeys.map((key, i) => {
        const def = resolveDef(attributeDefs, key);
        const state = attributes[key];
        const toNext = xpToNextLevel(state.level, def);
        const isFocus = profile?.focusDomains.includes(key);
        return (
          <Animated.View key={key} entering={FadeInDown.duration(320).delay(i * 60)}>
            <PressableScale onPress={() => router.push(`/attribute/${key}`)}>
              <Card style={{ marginBottom: spacing(3) }}>
                <View style={styles.row}>
                  <XPRing size={58} strokeWidth={5} progress={state.xpBuffer / toNext} color={def.color}>
                    <Text style={[styles.ringLevel, { color: def.color }]}>{state.level}</Text>
                  </XPRing>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <AttributeIcon attributeKey={key} size={13} />
                      <Text style={styles.name}>{def.name}</Text>
                      {isFocus && <Text style={[styles.focusTag, { color: def.color }]}>FOCUS</Text>}
                      {def.custom && <Text style={styles.customTag}>YOURS</Text>}
                    </View>
                    <View style={{ marginTop: spacing(2) }}>
                      <ProgressBar progress={state.xpBuffer / toNext} color={def.color} height={6} />
                      <Text style={styles.muted}>
                        {state.xpBuffer} / {toNext} XP · {state.totalAP} AP earned
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </PressableScale>
          </Animated.View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(4),
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
    maxWidth: 220,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    borderWidth: 1,
    borderColor: `${colors.accentCyan}55`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: `${colors.accentCyan}11`,
  },
  addBtnText: {
    color: colors.accentCyan,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },
  ringLevel: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  name: {
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: fonts.heading,
  },
  focusTag: {
    fontSize: 12,
    fontFamily: fonts.display,
    letterSpacing: 1,
  },
  customTag: {
    fontSize: 12,
    fontFamily: fonts.display,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(1),
  },
});
