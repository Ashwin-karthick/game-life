import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { ATTRIBUTE_DEFS, ATTRIBUTE_ORDER } from '@/lib/attributes';
import { selectionTick } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey } from '@/types/game';

const MAX_FOCUS = 3;

export function OnboardingFlow() {
  const createProfile = useGameStore((s) => s.createProfile);
  const logAction = useGameStore((s) => s.logAction);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [focusDomains, setFocusDomains] = useState<AttributeKey[]>([]);
  const [baseline, setBaseline] = useState<Record<AttributeKey, number>>(() => {
    const init = {} as Record<AttributeKey, number>;
    for (const key of ATTRIBUTE_ORDER) init[key] = 1;
    return init;
  });

  function toggleFocus(key: AttributeKey) {
    selectionTick();
    setFocusDomains((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_FOCUS) return prev;
      return [...prev, key];
    });
  }

  function finish() {
    createProfile(name.trim() || 'Hunter', focusDomains, baseline);
    // Fires the first celebration the moment they land on Home, instead of
    // whenever they stumble into their first real action days later.
    const firstFocusDomain = focusDomains[0];
    if (firstFocusDomain) {
      logAction(firstFocusDomain, 'epic', 60, 'Set up Game Life');
    }
  }

  return (
    <ScreenContainer contentStyle={{ flexGrow: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {step === 0 && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.step}>
            <Text style={styles.eyebrow}>◈ WELCOME, HUNTER ◈</Text>
            <Text style={styles.title}>Every real action you take becomes progress.</Text>
            <Text style={styles.body}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <Button onPress={() => setStep(1)} style={{ marginTop: spacing(6) }}>
              Continue
            </Button>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInRight.duration(350)} style={styles.step}>
            <Text style={styles.eyebrow}>STEP 2 OF 3</Text>
            <Text style={styles.title}>Pick 2–3 domains to focus on.</Text>
            <Text style={styles.body}>Your quests and recommendations will lean toward these first.</Text>
            <View style={styles.grid}>
              {ATTRIBUTE_ORDER.map((key, i) => {
                const def = ATTRIBUTE_DEFS[key];
                const selected = focusDomains.includes(key);
                return (
                  <Animated.View key={key} entering={FadeInDown.duration(300).delay(i * 50)} style={styles.focusWrap}>
                    <PressableScale
                      onPress={() => toggleFocus(key)}
                      style={[
                        styles.focusTile,
                        selected ? { borderColor: def.color, backgroundColor: `${def.color}18` } : null,
                      ]}
                    >
                      <AttributeIcon attributeKey={key} size={18} />
                      <Text style={[styles.focusLabel, selected ? { color: def.color } : null]}>{def.name}</Text>
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.row}>
              <Button variant="ghost" onPress={() => setStep(0)} style={{ flex: 1 }}>
                Back
              </Button>
              <Button onPress={() => setStep(2)} disabled={focusDomains.length === 0} style={{ flex: 1 }}>
                Continue
              </Button>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInRight.duration(350)} style={styles.step}>
            <Text style={styles.eyebrow}>STEP 3 OF 3</Text>
            <Text style={styles.title}>Rate your honest starting point.</Text>
            <Text style={styles.body}>This just sets your baseline level — everything from here is earned.</Text>
            {ATTRIBUTE_ORDER.map((key) => {
              const def = ATTRIBUTE_DEFS[key];
              return (
                <View key={key} style={styles.baselineRow}>
                  <View style={styles.baselineLabel}>
                    <AttributeIcon attributeKey={key} size={16} />
                    <Text style={styles.baselineName}>{def.name}</Text>
                  </View>
                  <View style={styles.dots}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <PressableScale
                        key={n}
                        scaleTo={0.85}
                        onPress={() => {
                          selectionTick();
                          setBaseline((prev) => ({ ...prev, [key]: n }));
                        }}
                        style={[
                          styles.dot,
                          n <= baseline[key] ? { backgroundColor: def.color, borderColor: def.color } : null,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
            <View style={styles.row}>
              <Button variant="ghost" onPress={() => setStep(1)} style={{ flex: 1 }}>
                Back
              </Button>
              <Button onPress={finish} style={{ flex: 1 }}>
                Begin
              </Button>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  step: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing(2),
  },
  eyebrow: {
    color: colors.accentCyan,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 3,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontFamily: fonts.heading,
    marginTop: spacing(2),
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: spacing(4),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    color: colors.textPrimary,
    fontSize: 16,
    backgroundColor: colors.bgSurface,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(3),
    marginBottom: spacing(4),
  },
  focusWrap: {
    width: '47%',
  },
  focusTile: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.md,
    padding: spacing(3),
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.bgSurface,
  },
  focusLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(4),
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2),
  },
  baselineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  baselineName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderGlass,
  },
});
