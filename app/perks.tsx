import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, glow, radius, spacing } from '@/constants/theme';
import { PERKS } from '@/lib/economy';
import { notifySuccess } from '@/lib/haptics';
import { selectAvailableAP, useGameStore } from '@/store/gameStore';

export default function PerksScreen() {
  const availableAP = useGameStore(selectAvailableAP);
  const unlockedPerks = useGameStore((s) => s.unlockedPerks);
  const buyPerk = useGameStore((s) => s.buyPerk);

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Perks',
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.textPrimary,
        }}
      />

      <View style={[styles.balanceCard, glow(colors.accentGold, 0.25, 14)]}>
        <Ionicons name="star" size={20} color={colors.accentGold} />
        <CountUp value={availableAP} style={styles.balanceValue} />
        <Text style={styles.balanceLabel}>POINTS TO SPEND</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.balanceHint}>Earned from leveling up</Text>
      </View>

      <Text style={styles.intro}>
        Perks are permanent upgrades. Spending points here never lowers your rank.
      </Text>

      {PERKS.map((perk, i) => {
        const unlocked = unlockedPerks.includes(perk.key);
        const affordable = availableAP >= perk.cost;
        return (
          <Animated.View key={perk.key} entering={FadeInDown.duration(300).delay(i * 45)}>
            <Card
              style={{ marginBottom: spacing(3), ...(unlocked ? { borderColor: `${colors.success}66` } : null) }}
            >
              <View style={styles.perkRow}>
                {perk.attributeKey ? (
                  <AttributeIcon attributeKey={perk.attributeKey} size={16} />
                ) : (
                  <View style={styles.perkIcon}>
                    <Ionicons
                      name={perk.effect === 'drop_chance' ? 'gift' : perk.effect === 'gem_bonus' ? 'diamond' : 'snow'}
                      size={16}
                      color={colors.accentGold}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.perkName}>{perk.name}</Text>
                  <Text style={styles.perkDesc}>{perk.description}</Text>
                </View>
                {unlocked ? (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Text style={styles.unlockedText}>Owned</Text>
                  </View>
                ) : (
                  <PressableScale
                    disabled={!affordable}
                    style={[styles.buyBtn, !affordable ? { opacity: 0.4 } : glow(colors.accentGold, 0.3, 8)]}
                    onPress={() => {
                      if (buyPerk(perk.key)) notifySuccess();
                    }}
                  >
                    <Ionicons name="star" size={12} color={colors.accentGold} />
                    <Text style={styles.buyText}>{perk.cost}</Text>
                  </PressableScale>
                )}
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: `${colors.accentGold}44`,
    borderRadius: radius.lg,
    padding: spacing(4),
  },
  balanceValue: {
    color: colors.accentGold,
    fontFamily: fonts.display,
    fontSize: 24,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  balanceHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 13,
    marginVertical: spacing(4),
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${colors.accentGold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkName: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  perkDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.accentGold}22`,
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  buyText: {
    color: colors.accentGold,
    fontFamily: fonts.display,
    fontSize: 13,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  unlockedText: {
    color: colors.success,
    fontFamily: fonts.heading,
    fontSize: 12,
  },
});
