import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SystemMessage } from '@/components/ui/SystemMessage';
import { colors, fonts, glow, radius, rarityColor, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { confirmDestructive } from '@/lib/confirm';
import { comboLength } from '@/lib/economy';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { todayLocalDateString } from '@/lib/progression';
import { useGameStore } from '@/store/gameStore';
import { DailyTask, Difficulty, Habit, QuestInstance, QuestState } from '@/types/game';

type Segment = 'habits' | 'dailies' | 'quests';
type QuestTab = 'available' | 'active' | 'completed';

const DAY_MS = 24 * 60 * 60 * 1000;

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'habits', label: 'Habits' },
  { key: 'dailies', label: 'Dailies' },
  { key: 'quests', label: 'Quests' },
];

const QUEST_TABS: { key: QuestTab; label: string; states: QuestState[] }[] = [
  { key: 'available', label: 'Available', states: ['available'] },
  { key: 'active', label: 'Active', states: ['active'] },
  { key: 'completed', label: 'Completed', states: ['completed', 'failed', 'abandoned'] },
];

const ACTIVE_QUEST_CAP = 5;

const DIFFICULTY_RARITY: Record<Difficulty, string> = {
  trivial: rarityColor.common,
  easy: rarityColor.common,
  medium: rarityColor.rare,
  hard: rarityColor.epic,
  epic: rarityColor.legendary,
};

export default function TasksScreen() {
  const [segment, setSegment] = useState<Segment>('habits');

  const addTarget =
    segment === 'habits' ? '/new-task?kind=habit' : segment === 'dailies' ? '/new-task?kind=daily' : '/new-quest';
  const addLabel = segment === 'habits' ? 'New habit' : segment === 'dailies' ? 'New daily' : 'New quest';

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tasks</Text>
        <PressableScale style={styles.addBtn} onPress={() => router.push(addTarget as any)}>
          <Ionicons name="add" size={16} color={colors.accentCyan} />
          <Text style={styles.addBtnText}>{addLabel}</Text>
        </PressableScale>
      </View>

      <View style={styles.segmentRow}>
        {SEGMENTS.map((s) => (
          <PressableScale
            key={s.key}
            onPress={() => setSegment(s.key)}
            style={[styles.segment, segment === s.key ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, segment === s.key ? styles.segmentTextActive : null]}>{s.label}</Text>
          </PressableScale>
        ))}
      </View>

      {segment === 'habits' && <HabitsSection />}
      {segment === 'dailies' && <DailiesSection />}
      {segment === 'quests' && <QuestsSection />}
    </ScreenContainer>
  );
}

// --- Habits ------------------------------------------------------------------

function HabitsSection() {
  const allHabits = useGameStore((s) => s.habits);
  const habits = useMemo(() => allHabits.filter((h) => !h.archived), [allHabits]);
  const logHabit = useGameStore((s) => s.logHabit);
  const archiveHabit = useGameStore((s) => s.archiveHabit);

  if (habits.length === 0) {
    return (
      <SystemMessage>
        Habits are things you do (or avoid) regularly.{'\n'}Add one and tap it each time it happens.
      </SystemMessage>
    );
  }

  return (
    <>
      {habits.map((h, i) => (
        <Animated.View key={h.id} entering={FadeInDown.duration(300).delay(i * 50)}>
          <HabitCard habit={h} onLog={logHabit} onArchive={archiveHabit} />
        </Animated.View>
      ))}
    </>
  );
}

function HabitCard({
  habit,
  onLog,
  onArchive,
}: {
  habit: Habit;
  onLog: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const defs = useGameStore((s) => s.attributeDefs);
  const def = resolveDef(defs, habit.attributeKey);
  const isGood = habit.polarity === 'good';
  const now = Date.now();
  const combo = comboLength(habit.logDates, now);

  const daysSinceSlip = useMemo(() => {
    if (habit.logDates.length === 0) return null;
    const last = habit.logDates[habit.logDates.length - 1];
    const diff = Math.floor((now - new Date(last + 'T00:00:00').getTime()) / DAY_MS);
    return diff;
  }, [habit.logDates, now]);

  return (
    <PressableScale haptic={false} onPress={() => router.push(`/new-task?kind=habit&id=${habit.id}`)}>
      <Card style={{ marginBottom: spacing(3) }}>
        <View style={styles.habitRow}>
          <AttributeIcon attributeKey={habit.attributeKey} size={16} />
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{habit.title}</Text>
            <View style={styles.habitMeta}>
              {isGood ? (
                combo > 0 ? (
                  <>
                    <Ionicons name="flame" size={12} color={colors.warning} />
                    <Text style={styles.metaText}>{combo}-day run</Text>
                  </>
                ) : (
                  <Text style={styles.metaText}>{habit.totalLogs} times total</Text>
                )
              ) : daysSinceSlip === null ? (
                <Text style={styles.metaText}>No slips yet — keep it up</Text>
              ) : daysSinceSlip === 0 ? (
                <Text style={[styles.metaText, { color: colors.danger }]}>Slipped today</Text>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>
                    Clean for {daysSinceSlip} day{daysSinceSlip > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </View>
          </View>
          {isGood ? (
            <PressableScale
              scaleTo={0.85}
              style={[styles.logBtn, { borderColor: def.color, backgroundColor: `${def.color}18` }, glow(def.color, 0.3, 8)]}
              onPress={() => {
                notifySuccess();
                onLog(habit.id);
              }}
              accessibilityLabel={`Log ${habit.title}`}
            >
              <Ionicons name="add" size={22} color={def.color} />
            </PressableScale>
          ) : (
            <PressableScale
              style={styles.slipBtn}
              onPress={() => {
                tapMedium();
                onLog(habit.id);
              }}
              accessibilityLabel={`Log a slip for ${habit.title}`}
            >
              <Text style={styles.slipText}>I slipped</Text>
            </PressableScale>
          )}
          <PressableScale
            haptic={false}
            style={styles.archiveBtn}
            onPress={() =>
              confirmDestructive(`Archive "${habit.title}"?`, 'Its history is kept.', 'Archive', () => onArchive(habit.id))
            }
            accessibilityLabel="Archive habit"
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </PressableScale>
        </View>
      </Card>
    </PressableScale>
  );
}

// --- Dailies -----------------------------------------------------------------

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DailiesSection() {
  const allDailies = useGameStore((s) => s.dailies);
  const dailies = useMemo(() => allDailies.filter((d) => !d.archived), [allDailies]);
  const completeDaily = useGameStore((s) => s.completeDaily);
  const archiveDaily = useGameStore((s) => s.archiveDaily);

  if (dailies.length === 0) {
    return (
      <SystemMessage>
        Dailies are your non-negotiables — done once a day.{'\n'}Miss a scheduled day and it costs you XP.
      </SystemMessage>
    );
  }

  return (
    <>
      {dailies.map((d, i) => (
        <Animated.View key={d.id} entering={FadeInDown.duration(300).delay(i * 50)}>
          <DailyCard daily={d} onComplete={completeDaily} onArchive={archiveDaily} />
        </Animated.View>
      ))}
    </>
  );
}

/** Consecutive scheduled-day completions, ending today (or yesterday if today is pending). */
function dailyRunLength(daily: DailyTask, now: number): number {
  let run = 0;
  let cursor = now;
  const today = todayLocalDateString(now);
  for (let i = 0; i < 60; i++) {
    const dateStr = todayLocalDateString(cursor);
    const weekday = new Date(cursor).getDay();
    if (dateStr < todayLocalDateString(daily.createdAt)) break;
    if (daily.weekdays.includes(weekday)) {
      if (daily.completedDates.includes(dateStr)) {
        run += 1;
      } else if (dateStr === today) {
        // Today still pending — doesn't break the run.
      } else {
        break;
      }
    }
    cursor -= DAY_MS;
  }
  return run;
}

function DailyCard({
  daily,
  onComplete,
  onArchive,
}: {
  daily: DailyTask;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const defs = useGameStore((s) => s.attributeDefs);
  const def = resolveDef(defs, daily.attributeKey);
  const now = Date.now();
  const today = todayLocalDateString(now);
  const doneToday = daily.completedDates.includes(today);
  const scheduledToday = daily.weekdays.includes(new Date(now).getDay());
  const run = useMemo(() => dailyRunLength(daily, now), [daily, now]);
  const everyDay = daily.weekdays.length === 7;

  const last7 = useMemo(() => {
    const days: { key: string; state: 'done' | 'missed' | 'off' | 'pending' }[] = [];
    const createdDate = todayLocalDateString(daily.createdAt);
    for (let i = 6; i >= 0; i--) {
      const t = now - i * DAY_MS;
      const key = todayLocalDateString(t);
      const weekday = new Date(t).getDay();
      let state: 'done' | 'missed' | 'off' | 'pending';
      if (daily.completedDates.includes(key)) state = 'done';
      else if (!daily.weekdays.includes(weekday) || key < createdDate) state = 'off';
      else if (key === today) state = 'pending';
      else state = 'missed';
      days.push({ key, state });
    }
    return days;
  }, [daily, now, today]);

  return (
    <PressableScale haptic={false} onPress={() => router.push(`/new-task?kind=daily&id=${daily.id}`)}>
      <Card style={{ marginBottom: spacing(3) }}>
        <View style={styles.habitRow}>
          <PressableScale
            scaleTo={0.85}
            disabled={doneToday}
            style={[
              styles.checkCircle,
              { borderColor: scheduledToday ? def.color : colors.borderGlass },
              doneToday ? { backgroundColor: def.color, borderColor: def.color } : null,
            ]}
            onPress={() => {
              notifySuccess();
              onComplete(daily.id);
            }}
            accessibilityLabel={doneToday ? `${daily.title} done today` : `Complete ${daily.title}`}
          >
            {doneToday && <Ionicons name="checkmark" size={18} color={colors.bgBase} />}
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, doneToday ? styles.taskTitleDone : null]}>{daily.title}</Text>
            <View style={styles.dailyMetaRow}>
              <View style={styles.dotRow}>
                {last7.map((d) => (
                  <View
                    key={d.key}
                    style={[
                      styles.dayDot,
                      d.state === 'done'
                        ? { backgroundColor: def.color }
                        : d.state === 'missed'
                        ? { backgroundColor: `${colors.danger}88` }
                        : d.state === 'pending'
                        ? { backgroundColor: colors.bgSurfaceRaised, borderWidth: 1, borderColor: def.color }
                        : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderGlass },
                    ]}
                  />
                ))}
              </View>
              {run > 1 && (
                <Text style={styles.metaText}>
                  <Ionicons name="flame" size={11} color={colors.warning} /> {run}
                </Text>
              )}
              {!everyDay && (
                <Text style={styles.metaText}>
                  {daily.weekdays
                    .slice()
                    .sort((a, b) => a - b)
                    .map((w) => WEEKDAY_LETTERS[w])
                    .join('')}
                </Text>
              )}
              {!scheduledToday && <Text style={styles.metaText}>off today</Text>}
            </View>
          </View>
          <PressableScale
            haptic={false}
            style={styles.archiveBtn}
            onPress={() =>
              confirmDestructive(`Archive "${daily.title}"?`, 'Its history is kept.', 'Archive', () => onArchive(daily.id))
            }
            accessibilityLabel="Archive daily"
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </PressableScale>
        </View>
      </Card>
    </PressableScale>
  );
}

// --- Quests -------------------------------------------------------------------

function QuestsSection() {
  const quests = useGameStore((s) => s.quests);
  const acceptQuest = useGameStore((s) => s.acceptQuest);
  const [tab, setTab] = useState<QuestTab>('available');

  const activeCount = quests.filter((q) => q.state === 'active' && q.type !== 'custom').length;
  const currentTab = QUEST_TABS.find((t) => t.key === tab)!;
  const filtered = useMemo(
    () =>
      quests
        .filter((q) => currentTab.states.includes(q.state))
        .sort((a, b) => {
          // Your own quests first, then newest offers.
          if ((a.type === 'custom') !== (b.type === 'custom')) return a.type === 'custom' ? -1 : 1;
          return (b.offeredAt ?? 0) - (a.offeredAt ?? 0);
        }),
    [quests, currentTab]
  );

  return (
    <>
      <View style={styles.questTabRow}>
        {QUEST_TABS.map((t) => (
          <PressableScale
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.questTab, tab === t.key ? styles.questTabActive : null]}
          >
            <Text style={[styles.questTabText, tab === t.key ? styles.questTabTextActive : null]}>{t.label}</Text>
          </PressableScale>
        ))}
        <View style={{ flex: 1 }} />
        <Chip label={`${activeCount}/${ACTIVE_QUEST_CAP}`} active={activeCount < ACTIVE_QUEST_CAP} color={colors.accentCyan} />
      </View>

      {filtered.length === 0 ? (
        <SystemMessage>
          {tab === 'available'
            ? 'No quest offers right now.\nNew offers arrive daily — or create your own.'
            : tab === 'active'
            ? 'No active quests.\nAccept an offer or create your own.'
            : 'No completed quests yet.\nYour record starts with one.'}
        </SystemMessage>
      ) : (
        filtered.map((q, i) => (
          <Animated.View key={q.id} entering={FadeInDown.duration(300).delay(i * 55)}>
            <QuestCard quest={q} onAccept={acceptQuest} />
          </Animated.View>
        ))
      )}
    </>
  );
}

function QuestCard({ quest, onAccept }: { quest: QuestInstance; onAccept: (id: string) => boolean }) {
  const defs = useGameStore((s) => s.attributeDefs);
  const def = resolveDef(defs, quest.attributeKey);
  const rarity = DIFFICULTY_RARITY[quest.difficulty];
  const isDone = quest.state === 'completed';

  return (
    <PressableScale onPress={() => router.push(`/quest/${quest.id}`)}>
      <Card style={{ marginBottom: spacing(3) }}>
        <View style={[styles.rarityStripe, { backgroundColor: rarity }]} />
        <View style={styles.questHeader}>
          <AttributeIcon attributeKey={quest.attributeKey} size={16} />
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{quest.title}</Text>
            <Text style={styles.muted}>{quest.description}</Text>
          </View>
          {isDone ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          ) : (
            <Chip label={quest.type === 'custom' ? 'yours' : quest.type} color={quest.type === 'custom' ? colors.accentGold : def.color} />
          )}
        </View>
        {quest.requirementCount > 1 && (
          <View style={{ marginTop: spacing(2) }}>
            <ProgressBar progress={quest.progressCount / quest.requirementCount} color={def.color} height={6} />
            <Text style={styles.muted}>
              {quest.progressCount} / {quest.requirementCount}
            </Text>
          </View>
        )}
        {quest.state === 'available' && (
          <PressableScale
            style={[styles.acceptBtn, { borderColor: def.color }]}
            onPress={() => {
              if (onAccept(quest.id)) notifySuccess();
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color={def.color} />
            <Text style={[styles.acceptText, { color: def.color }]}>Accept</Text>
          </PressableScale>
        )}
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
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
  taskTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.heading,
    fontSize: 16,
  },
  taskTitleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: 2,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  logBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipBtn: {
    borderWidth: 1,
    borderColor: `${colors.danger}66`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: `${colors.danger}11`,
  },
  slipText: {
    color: colors.danger,
    fontFamily: fonts.heading,
    fontSize: 12,
  },
  archiveBtn: {
    padding: spacing(1),
  },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(1),
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  questTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  questTab: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: 999,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  questTabActive: {
    backgroundColor: `${colors.accentCyan}22`,
    borderColor: colors.accentCyan,
  },
  questTabText: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  questTabTextActive: {
    color: colors.accentCyan,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  rarityStripe: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(3),
  },
  acceptBtn: {
    marginTop: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: spacing(2),
  },
  acceptText: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
});
