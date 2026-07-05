import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SystemMessage } from '@/components/ui/SystemMessage';
import { colors, fonts, glow, rarityColor, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { Difficulty } from '@/types/game';

const DIFFICULTY_RARITY: Record<Difficulty, string> = {
  trivial: rarityColor.common,
  easy: rarityColor.common,
  medium: rarityColor.rare,
  hard: rarityColor.epic,
  epic: rarityColor.legendary,
};

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quest = useGameStore((s) => s.quests.find((q) => q.id === id));
  const acceptQuest = useGameStore((s) => s.acceptQuest);
  const completeQuestStep = useGameStore((s) => s.completeQuestStep);
  const abandonQuest = useGameStore((s) => s.abandonQuest);
  const attributeDefs = useGameStore((s) => s.attributeDefs);

  if (!quest) {
    return (
      <ScreenContainer>
        <SystemMessage>This quest no longer exists.</SystemMessage>
      </ScreenContainer>
    );
  }

  const def = resolveDef(attributeDefs, quest.attributeKey);
  const rarity = DIFFICULTY_RARITY[quest.difficulty];
  const isMultiStep = quest.requirementCount > 1;

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Quest',
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.textPrimary,
        }}
      />

      <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
        <AttributeIcon attributeKey={quest.attributeKey} size={22} />
        <Chip label={quest.type} color={def.color} />
        <Chip label={quest.difficulty} color={rarity} />
      </Animated.View>

      <Animated.Text entering={FadeInDown.duration(350).delay(60)} style={styles.title}>
        {quest.title}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.duration(350).delay(110)} style={styles.description}>
        {quest.description}
      </Animated.Text>

      <Animated.View entering={FadeInDown.duration(350).delay(160)}>
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={styles.rationaleLabel}>WHY THIS QUEST</Text>
          <Text style={styles.rationale}>{quest.rationale}</Text>
        </Card>
      </Animated.View>

      {isMultiStep && (
        <Animated.View entering={FadeInDown.duration(350).delay(210)}>
          <Card style={{ marginTop: spacing(3) }}>
            <Text style={styles.rationaleLabel}>PROGRESS</Text>
            <ProgressBar progress={quest.progressCount / quest.requirementCount} color={def.color} />
            <Text style={styles.muted}>
              {quest.progressCount} / {quest.requirementCount} done
            </Text>
          </Card>
        </Animated.View>
      )}

      <View style={{ marginTop: spacing(6), gap: spacing(3) }}>
        {quest.state === 'available' && (
          <Button
            onPress={() => {
              if (acceptQuest(quest.id)) notifySuccess();
            }}
          >
            Accept Quest
          </Button>
        )}

        {quest.state === 'active' && !isMultiStep && (
          <Button onPress={() => completeQuestStep(quest.id)}>
            <Ionicons name="checkmark-circle" size={18} color={colors.bgBase} />
            <Text style={{ color: colors.bgBase, fontWeight: '700', fontSize: 15 }}>Mark Complete</Text>
          </Button>
        )}

        {quest.state === 'active' && isMultiStep && (
          <Button
            onPress={() => {
              tapMedium();
              completeQuestStep(quest.id);
            }}
          >
            +1 Done
          </Button>
        )}

        {quest.state === 'active' && (
          <Button
            variant="ghost"
            onPress={() => {
              abandonQuest(quest.id);
              router.back();
            }}
          >
            Abandon
          </Button>
        )}

        {quest.state === 'completed' && (
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.clearWrap}>
            <View style={[styles.clearStamp, glow(colors.success, 0.5, 16)]}>
              <Text style={styles.clearText}>QUEST CLEAR</Text>
            </View>
            <Text style={styles.clearSub}>Real effort, real reward.</Text>
          </Animated.View>
        )}
        {quest.state === 'failed' && (
          <SystemMessage title="EXPIRED" color={colors.warning}>
            This one didn't get finished in time.{'\n'}Whatever progress you made still counted.
          </SystemMessage>
        )}
        {quest.state === 'abandoned' && (
          <SystemMessage title="DROPPED" color={colors.textMuted}>
            No penalty — pick it up again anytime it's offered.
          </SystemMessage>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
    marginTop: spacing(3),
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing(2),
  },
  rationaleLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: spacing(1),
  },
  rationale: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(1),
  },
  clearWrap: {
    alignItems: 'center',
    gap: spacing(2),
    paddingVertical: spacing(4),
  },
  clearStamp: {
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(2),
    transform: [{ rotate: '-6deg' }],
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  clearText: {
    color: colors.success,
    fontFamily: fonts.displayBlack,
    fontSize: 20,
    letterSpacing: 3,
  },
  clearSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
