import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, spacing } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { EventType } from '@/types/game';

const TYPE_LABEL: Record<EventType, string> = {
  xp_grant: 'XP',
  ap_grant: 'Level Up',
  decay: 'Decay',
  quest_complete: 'Quest Complete',
  quest_partial: 'Quest Progress',
  habit_slip: 'Habit Slip',
  daily_miss: 'Missed Daily',
  reward_redeem: 'Reward',
  loot_drop: 'Item Found',
  challenge_clear: 'Challenge Cleared',
};

export default function JournalScreen() {
  const events = useGameStore((s) => s.events);

  const sorted = useMemo(() => [...events].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200), [events]);

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Journal', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
      <Text style={styles.subtitle}>Every logged action, in order — your honest ledger.</Text>

      {sorted.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Nothing logged yet. Head to Home and log your first action.</Text>
        </Card>
      ) : (
        sorted.map((e) => (
          <Card key={e.id} style={{ marginBottom: spacing(2) }}>
            <View style={styles.row}>
              {e.attributeKey ? (
                <AttributeIcon attributeKey={e.attributeKey} size={16} />
              ) : (
                <View style={styles.genericIcon}>
                  <Ionicons
                    name={e.type === 'reward_redeem' ? 'gift' : e.type === 'challenge_clear' ? 'trophy' : 'cube'}
                    size={16}
                    color={colors.accentGold}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.note}>{e.note}</Text>
                <Text style={styles.muted}>
                  {TYPE_LABEL[e.type]} · {new Date(e.createdAt).toLocaleString()}
                </Text>
              </View>
              {e.amount !== 0 && (
                <Text style={[styles.amount, { color: e.amount > 0 ? colors.success : colors.danger }]}>
                  {e.amount > 0 ? '+' : ''}
                  {Math.round(e.amount)}
                </Text>
              )}
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  note: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  amount: {
    fontWeight: '800',
    fontSize: 13,
  },
  genericIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${colors.accentGold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
