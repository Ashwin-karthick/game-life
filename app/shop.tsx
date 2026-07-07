import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SystemMessage } from '@/components/ui/SystemMessage';
import { colors, fonts, glow, radius, rarityColor, spacing } from '@/constants/theme';
import { confirmDestructive } from '@/lib/confirm';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { InventoryItem } from '@/types/game';

type Segment = 'rewards' | 'collection';

const ITEM_ICON: Record<InventoryItem['kind'], keyof typeof Ionicons.glyphMap> = {
  gem_cache: 'diamond',
  streak_freeze: 'snow',
  xp_booster: 'flash',
  artifact: 'sparkles',
};

export default function ShopScreen() {
  const [segment, setSegment] = useState<Segment>('rewards');
  const gems = useGameStore((s) => s.wallet.gems);

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Shop',
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.textPrimary,
        }}
      />

      <View style={[styles.balanceCard, glow(colors.accentCyan, 0.25, 14)]}>
        <Ionicons name="diamond" size={22} color={colors.accentCyan} />
        <CountUp value={gems} style={styles.balanceValue} />
        <Text style={styles.balanceLabel}>GEMS</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.balanceHint}>Earned from every action</Text>
      </View>

      <View style={styles.segmentRow}>
        {(['rewards', 'collection'] as Segment[]).map((s) => (
          <PressableScale
            key={s}
            onPress={() => setSegment(s)}
            style={[styles.segment, segment === s ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, segment === s ? styles.segmentTextActive : null]}>
              {s === 'rewards' ? 'Rewards' : 'Collection'}
            </Text>
          </PressableScale>
        ))}
      </View>

      {segment === 'rewards' ? <RewardsSection gems={gems} /> : <CollectionSection />}
    </ScreenContainer>
  );
}

function RewardsSection({ gems }: { gems: number }) {
  const rewards = useGameStore((s) => s.rewards);
  const redeemReward = useGameStore((s) => s.redeemReward);
  const deleteReward = useGameStore((s) => s.deleteReward);

  return (
    <>
      <PressableScale style={styles.addRow} onPress={() => router.push('/new-reward')}>
        <Ionicons name="add-circle" size={18} color={colors.accentCyan} />
        <Text style={styles.addRowText}>Add a reward — anything you enjoy in real life</Text>
      </PressableScale>

      {rewards.length === 0 ? (
        <SystemMessage>
          Set up treats you can buy with gems.{'\n'}"1 hour of gaming — 50 gems" is a classic.
        </SystemMessage>
      ) : (
        rewards.map((r, i) => {
          const affordable = gems >= r.cost;
          return (
            <Animated.View key={r.id} entering={FadeInDown.duration(300).delay(i * 50)}>
              <PressableScale haptic={false} onPress={() => router.push(`/new-reward?id=${r.id}`)}>
                <Card style={{ marginBottom: spacing(3) }}>
                  <View style={styles.rewardRow}>
                    <View style={styles.rewardIcon}>
                      <Ionicons name="gift" size={18} color={colors.accentGold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardTitle}>{r.title}</Text>
                      <Text style={styles.rewardCost}>
                        <Ionicons name="diamond" size={11} color={colors.accentCyan} /> {r.cost} gems
                      </Text>
                    </View>
                    <PressableScale
                      disabled={!affordable}
                      style={[styles.redeemBtn, !affordable ? { opacity: 0.4 } : glow(colors.accentCyan, 0.3, 8)]}
                      onPress={() => {
                        if (redeemReward(r.id)) notifySuccess();
                      }}
                    >
                      <Text style={styles.redeemText}>Redeem</Text>
                    </PressableScale>
                    <PressableScale
                      haptic={false}
                      style={styles.deleteBtn}
                      onPress={() =>
                        confirmDestructive(`Delete "${r.title}"?`, 'This reward is removed from your shop.', 'Delete', () =>
                          deleteReward(r.id)
                        )
                      }
                      accessibilityLabel="Delete reward"
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                    </PressableScale>
                  </View>
                </Card>
              </PressableScale>
            </Animated.View>
          );
        })
      )}
    </>
  );
}

function CollectionSection() {
  const inventory = useGameStore((s) => s.inventory);
  const useItem = useGameStore((s) => s.useItem);

  const { usable, artifacts } = useMemo(() => {
    return {
      usable: inventory.filter((i) => i.kind !== 'artifact' && i.consumedAt === null),
      artifacts: inventory.filter((i) => i.kind === 'artifact'),
    };
  }, [inventory]);

  if (inventory.length === 0) {
    return (
      <SystemMessage>
        Items drop when you complete quests and dailies.{'\n'}Whatever you find shows up here.
      </SystemMessage>
    );
  }

  return (
    <>
      {usable.length > 0 && <Text style={styles.sectionLabel}>READY TO USE</Text>}
      {usable.map((item, i) => (
        <Animated.View key={item.id} entering={FadeInDown.duration(300).delay(i * 50)}>
          <Card style={{ marginBottom: spacing(3) }}>
            <View style={styles.rewardRow}>
              <View style={[styles.rewardIcon, { backgroundColor: `${rarityColor[item.rarity]}22` }]}>
                <Ionicons name={ITEM_ICON[item.kind]} size={18} color={rarityColor[item.rarity]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
              <PressableScale
                style={[styles.redeemBtn, glow(rarityColor[item.rarity], 0.3, 8)]}
                onPress={() => {
                  tapMedium();
                  useItem(item.id);
                }}
              >
                <Text style={styles.redeemText}>Use</Text>
              </PressableScale>
            </View>
          </Card>
        </Animated.View>
      ))}

      {artifacts.length > 0 && <Text style={styles.sectionLabel}>COLLECTION</Text>}
      <View style={styles.artifactGrid}>
        {artifacts.map((item, i) => (
          <Animated.View key={item.id} entering={FadeInDown.duration(300).delay(i * 40)} style={styles.artifactWrap}>
            <View style={[styles.artifactTile, { borderColor: `${rarityColor[item.rarity]}66` }]}>
              <Ionicons name="sparkles" size={20} color={rarityColor[item.rarity]} />
              <Text style={styles.artifactName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.artifactRarity, { color: rarityColor[item.rarity] }]}>{item.rarity.toUpperCase()}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: `${colors.accentCyan}44`,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  balanceValue: {
    color: colors.accentCyan,
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
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: 4,
    marginBottom: spacing(4),
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: `${colors.accentCyan}22`,
  },
  segmentText: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  segmentTextActive: {
    color: colors.accentCyan,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${colors.accentCyan}55`,
    borderRadius: radius.md,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  addRowText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '600',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  rewardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.accentGold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  rewardCost: {
    color: colors.accentCyan,
    fontSize: 12,
    marginTop: 2,
  },
  itemDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  redeemBtn: {
    backgroundColor: `${colors.accentCyan}22`,
    borderWidth: 1,
    borderColor: colors.accentCyan,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  redeemText: {
    color: colors.accentCyan,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  deleteBtn: {
    padding: spacing(1),
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: spacing(2),
    marginBottom: spacing(3),
  },
  artifactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(3),
  },
  artifactWrap: {
    width: '30%',
  },
  artifactTile: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.bgSurface,
    minHeight: 96,
    justifyContent: 'center',
  },
  artifactName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  artifactRarity: {
    fontFamily: fonts.display,
    fontSize: 8,
    letterSpacing: 1,
  },
});
