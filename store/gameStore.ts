import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ATTRIBUTE_ORDER,
  createAttributeState,
  createInitialAttributeState,
  MAX_AREAS,
  resolveDef,
  seedAttributeDefs,
} from '@/lib/attributes';
import {
  DROP_CHANCE,
  effectiveDropChance,
  freezeTokenCap,
  gemMultiplier,
  gemsForXp,
  generateWeeklyChallenge,
  trimDates,
  weekKeyFor,
  xpPerkMultiplier,
  PERKS,
} from '@/lib/economy';
import { generateId } from '@/lib/id';
import {
  applyDecay,
  applyXpGrant,
  baseActionXp,
  computeHunterRank,
  isStreakStaleToday,
  todayLocalDateString,
  updateStreakOnAction,
} from '@/lib/progression';
import { generateComebackQuest, generateDailyOffers, generateWeeklyOffers } from '@/lib/quests';
import {
  AttributeDef,
  AttributeKey,
  AttributeState,
  DailyTask,
  Difficulty,
  Habit,
  HabitPolarity,
  HunterRankTier,
  InventoryItem,
  ProfileState,
  ProgressionEvent,
  QuestInstance,
  RewardDef,
  SettingsState,
  StreakState,
  WalletState,
  WeeklyChallenge,
} from '@/types/game';
import { rollLoot } from '@/lib/economy';

export interface Celebration {
  kind: 'level' | 'rank' | 'challenge';
  attributeKey?: AttributeKey;
  newLevel?: number;
  rankTier?: HunterRankTier;
  rankTitle?: string;
  gems?: number;
}

interface GameStore {
  profile: ProfileState | null;
  attributes: Record<AttributeKey, AttributeState>;
  events: ProgressionEvent[];
  quests: QuestInstance[];
  streak: StreakState;
  settings: SettingsState;
  celebration: Celebration | null;
  hasHydrated: boolean;

  // V2
  wallet: WalletState;
  habits: Habit[];
  dailies: DailyTask[];
  rewards: RewardDef[];
  inventory: InventoryItem[];
  challenge: WeeklyChallenge | null;
  unlockedPerks: string[];
  spentAP: number;

  // V3
  attributeDefs: Record<string, AttributeDef>;
  attributeOrder: string[];
  lastDailySweepDate: string | null;
  seenIntroVersion: number;

  setHasHydrated: (v: boolean) => void;
  createProfile: (name: string, focusDomains: AttributeKey[], baselineLevels: Partial<Record<AttributeKey, number>>) => void;
  logAction: (attributeKey: AttributeKey, difficulty: Difficulty, minutes: number, note: string) => void;
  acceptQuest: (id: string) => boolean;
  completeQuestStep: (id: string) => void;
  abandonQuest: (id: string) => void;
  tickOnAppOpen: () => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  updateFocusDomains: (domains: AttributeKey[]) => void;
  clearCelebration: () => void;
  resetAllData: () => void;

  // V2 actions
  addHabit: (title: string, polarity: HabitPolarity, attributeKey: AttributeKey, difficulty: Difficulty) => void;
  logHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  addDaily: (title: string, attributeKey: AttributeKey, difficulty: Difficulty, weekdays?: number[]) => void;
  completeDaily: (id: string) => void;
  archiveDaily: (id: string) => void;
  addReward: (title: string, cost: number) => void;
  deleteReward: (id: string) => void;
  redeemReward: (id: string) => boolean;
  useItem: (id: string) => void;
  buyPerk: (key: string) => boolean;

  // V3 actions
  addArea: (name: string, icon: string, color: string) => boolean;
  archiveArea: (key: string) => void;
  addQuest: (
    title: string,
    description: string,
    attributeKey: AttributeKey,
    difficulty: Difficulty,
    requirementCount: number,
    dueAt: number | null
  ) => void;
  updateHabit: (id: string, fields: Partial<Pick<Habit, 'title' | 'polarity' | 'attributeKey' | 'difficulty'>>) => void;
  updateDaily: (id: string, fields: Partial<Pick<DailyTask, 'title' | 'attributeKey' | 'difficulty' | 'weekdays'>>) => void;
  updateReward: (id: string, fields: Partial<Pick<RewardDef, 'title' | 'cost'>>) => void;
  importData: (json: string) => boolean;
  markIntroSeen: () => void;
}

const ACTIVE_QUEST_CAP = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const EFFORT_MINUTES: Record<Difficulty, number> = { trivial: 5, easy: 15, medium: 30, hard: 45, epic: 60 };

const V2_DEFAULTS = {
  wallet: { gems: 0, xpBoostUntil: null } as WalletState,
  habits: [] as Habit[],
  dailies: [] as DailyTask[],
  rewards: [] as RewardDef[],
  inventory: [] as InventoryItem[],
  challenge: null as WeeklyChallenge | null,
  unlockedPerks: [] as string[],
  spentAP: 0,
};

const v3Defaults = () => ({
  attributeDefs: seedAttributeDefs(),
  attributeOrder: [...ATTRIBUTE_ORDER] as string[],
  lastDailySweepDate: null as string | null,
  seenIntroVersion: 3,
});

function slugifyAreaKey(name: string, existing: Record<string, unknown>): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'area';
  let key = base;
  let i = 2;
  while (existing[key]) {
    key = `${base}-${i}`;
    i += 1;
  }
  return key;
}

function grantXpAndRecord(
  attributes: Record<AttributeKey, AttributeState>,
  events: ProgressionEvent[],
  streak: StreakState,
  def: AttributeDef,
  attributeKey: AttributeKey,
  baseXp: number,
  note: string,
  now: number,
  questId?: string
): { attributes: Record<AttributeKey, AttributeState>; events: ProgressionEvent[]; levelUps: number; finalXp: number } {
  const result = applyXpGrant(attributes[attributeKey], def, baseXp, streak.currentLen, now);

  const newEvents: ProgressionEvent[] = [
    {
      id: generateId(),
      type: 'xp_grant',
      attributeKey,
      amount: result.finalXp,
      note,
      questId,
      createdAt: now,
    },
    ...result.levelUps.map((lu) => ({
      id: generateId(),
      type: 'ap_grant' as const,
      attributeKey,
      amount: lu.apGained,
      note: `Reached level ${lu.newLevel}`,
      questId,
      createdAt: now,
    })),
  ];

  return {
    attributes: { ...attributes, [attributeKey]: result.state },
    events: [...events, ...newEvents],
    levelUps: result.levelUps.length,
    finalXp: result.finalXp,
  };
}

function totalAP(attributes: Record<AttributeKey, AttributeState>): number {
  return Object.values(attributes).reduce((sum, s) => sum + s.totalAP, 0);
}

interface GrantOutcome {
  attributes: Record<AttributeKey, AttributeState>;
  events: ProgressionEvent[];
  streak: StreakState;
  wallet: WalletState;
  challenge: WeeklyChallenge | null;
  inventory: InventoryItem[];
  celebration: Celebration | null;
}

/**
 * The one path through which all XP-earning actions flow: applies perk/boost
 * multipliers, grants XP + gems, advances the weekly challenge, rolls loot,
 * and picks the most important celebration (rank > challenge > level).
 */
function performGrant(
  s: Pick<
    GameStore,
    'attributes' | 'events' | 'streak' | 'wallet' | 'challenge' | 'inventory' | 'unlockedPerks' | 'celebration' | 'attributeDefs'
  >,
  attributeKey: AttributeKey,
  rawBaseXp: number,
  note: string,
  now: number,
  opts: { questId?: string; dropChance: number }
): GrantOutcome {
  const boostActive = s.wallet.xpBoostUntil !== null && now < s.wallet.xpBoostUntil;
  const multiplier = xpPerkMultiplier(s.unlockedPerks, attributeKey) * (boostActive ? 1.2 : 1);
  const def = resolveDef(s.attributeDefs, attributeKey);

  const beforeAP = totalAP(s.attributes);
  const granted = grantXpAndRecord(s.attributes, s.events, s.streak, def, attributeKey, rawBaseXp * multiplier, note, now, opts.questId);
  const streakResult = updateStreakOnAction(s.streak, now);
  const afterAP = totalAP(granted.attributes);

  let events = granted.events;
  let gems = s.wallet.gems + Math.round(gemsForXp(granted.finalXp) * gemMultiplier(s.unlockedPerks));

  // Weekly challenge progress
  let challenge = s.challenge;
  let challengeCleared = false;
  if (challenge && challenge.state === 'active') {
    const progressXp = challenge.progressXp + granted.finalXp;
    if (progressXp >= challenge.targetXp) {
      challenge = { ...challenge, progressXp, state: 'cleared', clearedAt: now };
      gems += challenge.gemReward;
      challengeCleared = true;
      events = [
        ...events,
        {
          id: generateId(),
          type: 'challenge_clear',
          amount: challenge.gemReward,
          note: `Weekly challenge cleared — +${challenge.gemReward} gems`,
          createdAt: now,
        },
      ];
    } else {
      challenge = { ...challenge, progressXp };
    }
  }

  // Loot roll
  let inventory = s.inventory;
  const drop = rollLoot(effectiveDropChance(opts.dropChance, s.unlockedPerks), now);
  if (drop) {
    inventory = [...inventory, drop];
    events = [
      ...events,
      {
        id: generateId(),
        type: 'loot_drop',
        amount: 0,
        note: `Found: ${drop.name}`,
        createdAt: now,
      },
    ];
  }

  // Celebration priority: rank > challenge > level
  let celebration: Celebration | null = null;
  const beforeRank = computeHunterRank(beforeAP);
  const afterRank = computeHunterRank(afterAP);
  if (afterRank.tier !== beforeRank.tier) {
    celebration = { kind: 'rank', rankTier: afterRank.tier, rankTitle: afterRank.title };
  } else if (challengeCleared && challenge) {
    celebration = { kind: 'challenge', gems: challenge.gemReward };
  } else if (granted.levelUps > 0) {
    celebration = { kind: 'level', attributeKey, newLevel: granted.attributes[attributeKey].level };
  }

  return {
    attributes: granted.attributes,
    events,
    streak: streakResult.streak,
    wallet: { ...s.wallet, gems },
    challenge,
    inventory,
    celebration: celebration ?? s.celebration,
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      profile: null,
      attributes: createInitialAttributeState(Date.now()),
      events: [],
      quests: [],
      streak: { currentLen: 0, longestLen: 0, lastActiveDate: null, freezeTokens: 0 },
      settings: { reminderEnabled: false, reminderHour: 20, reminderMinute: 0 },
      celebration: null,
      hasHydrated: false,
      ...V2_DEFAULTS,
      ...v3Defaults(),

      setHasHydrated: (v) => set({ hasHydrated: v }),

      createProfile: (name, focusDomains, baselineLevels) => {
        const now = Date.now();
        const attributes = createInitialAttributeState(now);
        for (const key of ATTRIBUTE_ORDER) {
          const lvl = baselineLevels[key];
          if (lvl && lvl > 1) attributes[key].level = lvl;
        }
        set({
          profile: { name, createdAt: now, focusDomains },
          attributes,
          ...V2_DEFAULTS,
          ...v3Defaults(),
        });
        get().tickOnAppOpen();
      },

      logAction: (attributeKey, difficulty, minutes, note) => {
        const now = Date.now();
        const outcome = performGrant(
          get(),
          attributeKey,
          baseActionXp(difficulty, minutes),
          note || 'Logged action',
          now,
          { dropChance: 0 }
        );
        set(outcome);
      },

      acceptQuest: (id) => {
        const { quests } = get();
        // User-created quests don't count against the offer cap.
        const activeCount = quests.filter((q) => q.state === 'active' && q.type !== 'custom').length;
        if (activeCount >= ACTIVE_QUEST_CAP) return false;
        const now = Date.now();
        set({
          quests: quests.map((q) => (q.id === id ? { ...q, state: 'active', acceptedAt: now } : q)),
        });
        return true;
      },

      completeQuestStep: (id) => {
        const now = Date.now();
        const state = get();
        const quest = state.quests.find((q) => q.id === id);
        if (!quest || quest.state !== 'active') return;

        const newProgress = quest.progressCount + 1;
        const isDone = newProgress >= quest.requirementCount;
        const unitBaseXp = baseActionXp(quest.difficulty, quest.effortMinutes) / quest.requirementCount;

        const outcome = performGrant(state, quest.attributeKey, unitBaseXp, `Quest: ${quest.title}`, now, {
          questId: quest.id,
          // Loot only rolls when the quest actually completes.
          dropChance: isDone ? DROP_CHANCE.quest : 0,
        });

        set({
          ...outcome,
          events: [
            ...outcome.events,
            ...(isDone
              ? [
                  {
                    id: generateId(),
                    type: 'quest_complete' as const,
                    attributeKey: quest.attributeKey,
                    amount: 0,
                    note: `Completed: ${quest.title}`,
                    questId: quest.id,
                    createdAt: now,
                  },
                ]
              : []),
          ],
          quests: state.quests.map((q) =>
            q.id === id
              ? { ...q, progressCount: newProgress, state: isDone ? 'completed' : q.state, completedAt: isDone ? now : null }
              : q
          ),
        });
      },

      abandonQuest: (id) => {
        set({ quests: get().quests.map((q) => (q.id === id ? { ...q, state: 'abandoned' } : q)) });
      },

      tickOnAppOpen: () => {
        const now = Date.now();
        const { attributes, events, streak, profile, quests, challenge, attributeDefs, attributeOrder, dailies, lastDailySweepDate } = get();

        const newAttributes = { ...attributes };
        const decayEvents: ProgressionEvent[] = [];
        for (const key of attributeOrder) {
          const def = attributeDefs[key];
          if (!def || def.archived || !newAttributes[key]) continue;
          const { state, decayedAmount } = applyDecay(newAttributes[key], def, now);
          newAttributes[key] = state;
          if (decayedAmount > 0) {
            decayEvents.push({
              id: generateId(),
              type: 'decay',
              attributeKey: key,
              amount: -decayedAmount,
              note: 'Daily decay',
              createdAt: now,
            });
          }
        }

        // Dailies 2.0 sweep: strict penalty for yesterday's missed scheduled dailies.
        // One-day grace window — being away longer never stacks penalties.
        const today = todayLocalDateString(now);
        const yesterday = todayLocalDateString(now - DAY_MS);
        const yesterdayWeekday = new Date(now - DAY_MS).getDay();
        const missEvents: ProgressionEvent[] = [];
        if (lastDailySweepDate !== null && lastDailySweepDate !== today) {
          for (const d of dailies) {
            if (d.archived) continue;
            if (!d.weekdays.includes(yesterdayWeekday)) continue;
            if (todayLocalDateString(d.createdAt) >= yesterday) continue; // grace on creation day
            if (d.completedDates.includes(yesterday)) continue;
            const attr = newAttributes[d.attributeKey];
            if (!attr) continue;
            const penalty = Math.round(baseActionXp(d.difficulty, 20));
            const applied = Math.min(attr.xpBuffer, penalty);
            newAttributes[d.attributeKey] = { ...attr, xpBuffer: attr.xpBuffer - applied };
            missEvents.push({
              id: generateId(),
              type: 'daily_miss',
              attributeKey: d.attributeKey,
              amount: -applied,
              note: `Missed: ${d.title}`,
              createdAt: now,
            });
          }
        }

        let newStreak = streak;
        const wasStale = isStreakStaleToday(streak, now);
        if (wasStale) {
          newStreak = { ...streak, currentLen: 0 };
        }

        let newQuests = [...quests];
        newQuests = newQuests.map((q) => {
          if ((q.state === 'active' || q.state === 'available') && q.dueAt && q.dueAt < now) {
            return { ...q, state: q.state === 'active' ? 'failed' : 'abandoned' };
          }
          return q;
        });

        if (profile) {
          const activeKeys = attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived);
          const hasTodayDaily = newQuests.some((q) => q.type === 'daily' && new Date(q.offeredAt).toDateString() === new Date(now).toDateString());
          if (!hasTodayDaily) {
            newQuests.push(...generateDailyOffers(newAttributes, profile.focusDomains, now, 4, activeKeys));
          }

          const hasLiveWeekly = newQuests.some((q) => q.type === 'weekly' && (q.state === 'available' || q.state === 'active'));
          if (!hasLiveWeekly) {
            newQuests.push(...generateWeeklyOffers(newAttributes, profile.focusDomains, now, 2, activeKeys));
          }

          const hasLiveComeback = newQuests.some((q) => q.type === 'comeback' && (q.state === 'available' || q.state === 'active'));
          if ((wasStale || newStreak.currentLen === 0) && !hasLiveComeback && streak.lastActiveDate !== null) {
            newQuests.push(generateComebackQuest(now));
          }
        }

        // Weekly challenge rollover
        let newChallenge = challenge;
        const wk = weekKeyFor(now);
        if (profile && (!newChallenge || newChallenge.weekKey !== wk)) {
          if (newChallenge && newChallenge.weekKey !== wk && newChallenge.state === 'active') {
            newChallenge = { ...newChallenge, state: 'failed' };
          }
          newChallenge = generateWeeklyChallenge(events, now);
        }

        set({
          attributes: newAttributes,
          events: [...events, ...decayEvents, ...missEvents],
          streak: newStreak,
          quests: newQuests,
          challenge: newChallenge,
          lastDailySweepDate: today,
        });
      },

      updateSettings: (partial) => set({ settings: { ...get().settings, ...partial } }),

      updateFocusDomains: (domains) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, focusDomains: domains } });
      },

      clearCelebration: () => set({ celebration: null }),

      resetAllData: () => {
        const now = Date.now();
        set({
          profile: null,
          attributes: createInitialAttributeState(now),
          events: [],
          quests: [],
          streak: { currentLen: 0, longestLen: 0, lastActiveDate: null, freezeTokens: 0 },
          settings: { reminderEnabled: false, reminderHour: 20, reminderMinute: 0 },
          celebration: null,
          ...V2_DEFAULTS,
          ...v3Defaults(),
        });
      },

      // --- V2 actions ------------------------------------------------------

      addHabit: (title, polarity, attributeKey, difficulty) => {
        const habit: Habit = {
          id: generateId(),
          title: title.trim(),
          polarity,
          attributeKey,
          difficulty,
          createdAt: Date.now(),
          archived: false,
          logDates: [],
          totalLogs: 0,
        };
        set({ habits: [...get().habits, habit] });
      },

      logHabit: (id) => {
        const now = Date.now();
        const state = get();
        const habit = state.habits.find((h) => h.id === id && !h.archived);
        if (!habit) return;

        const today = todayLocalDateString(now);
        const updatedHabit: Habit = {
          ...habit,
          logDates: trimDates(habit.logDates.includes(today) ? habit.logDates : [...habit.logDates, today]),
          totalLogs: habit.totalLogs + 1,
        };
        const habits = state.habits.map((h) => (h.id === id ? updatedHabit : h));

        if (habit.polarity === 'good') {
          const outcome = performGrant(state, habit.attributeKey, baseActionXp(habit.difficulty, 15), `Habit: ${habit.title}`, now, {
            dropChance: DROP_CHANCE.habit,
          });
          set({ ...outcome, habits });
        } else {
          // Slipping on a bad habit costs XP from the buffer (never below zero).
          const penalty = Math.round(baseActionXp(habit.difficulty, 15));
          const attr = state.attributes[habit.attributeKey];
          const newBuffer = Math.max(0, attr.xpBuffer - penalty);
          set({
            habits,
            attributes: { ...state.attributes, [habit.attributeKey]: { ...attr, xpBuffer: newBuffer } },
            events: [
              ...state.events,
              {
                id: generateId(),
                type: 'habit_slip',
                attributeKey: habit.attributeKey,
                amount: -(attr.xpBuffer - newBuffer),
                note: `Slipped: ${habit.title}`,
                createdAt: now,
              },
            ],
          });
        }
      },

      archiveHabit: (id) => {
        set({ habits: get().habits.map((h) => (h.id === id ? { ...h, archived: true } : h)) });
      },

      addDaily: (title, attributeKey, difficulty, weekdays) => {
        const daily: DailyTask = {
          id: generateId(),
          title: title.trim(),
          attributeKey,
          difficulty,
          createdAt: Date.now(),
          archived: false,
          completedDates: [],
          weekdays: weekdays && weekdays.length > 0 ? weekdays : [...ALL_WEEKDAYS],
        };
        set({ dailies: [...get().dailies, daily] });
      },

      completeDaily: (id) => {
        const now = Date.now();
        const state = get();
        const daily = state.dailies.find((d) => d.id === id && !d.archived);
        const today = todayLocalDateString(now);
        if (!daily || daily.completedDates.includes(today)) return;

        const dailies = state.dailies.map((d) =>
          d.id === id ? { ...d, completedDates: trimDates([...d.completedDates, today]) } : d
        );
        const outcome = performGrant(state, daily.attributeKey, baseActionXp(daily.difficulty, 20), `Daily: ${daily.title}`, now, {
          dropChance: DROP_CHANCE.daily,
        });
        set({ ...outcome, dailies });
      },

      archiveDaily: (id) => {
        set({ dailies: get().dailies.map((d) => (d.id === id ? { ...d, archived: true } : d)) });
      },

      addReward: (title, cost) => {
        const reward: RewardDef = { id: generateId(), title: title.trim(), cost, createdAt: Date.now() };
        set({ rewards: [...get().rewards, reward] });
      },

      deleteReward: (id) => {
        set({ rewards: get().rewards.filter((r) => r.id !== id) });
      },

      redeemReward: (id) => {
        const state = get();
        const reward = state.rewards.find((r) => r.id === id);
        if (!reward || state.wallet.gems < reward.cost) return false;
        set({
          wallet: { ...state.wallet, gems: state.wallet.gems - reward.cost },
          events: [
            ...state.events,
            {
              id: generateId(),
              type: 'reward_redeem',
              amount: -reward.cost,
              note: `Redeemed: ${reward.title}`,
              createdAt: Date.now(),
            },
          ],
        });
        return true;
      },

      useItem: (id) => {
        const now = Date.now();
        const state = get();
        const item = state.inventory.find((i) => i.id === id && i.consumedAt === null);
        if (!item || item.kind === 'artifact') return;

        let wallet = state.wallet;
        let streak = state.streak;
        if (item.kind === 'gem_cache') {
          wallet = { ...wallet, gems: wallet.gems + (item.gemValue ?? 0) };
        } else if (item.kind === 'streak_freeze') {
          const cap = freezeTokenCap(state.unlockedPerks);
          if (state.streak.freezeTokens >= cap) return; // don't waste the item
          streak = { ...streak, freezeTokens: streak.freezeTokens + 1 };
        } else if (item.kind === 'xp_booster') {
          const from = wallet.xpBoostUntil && wallet.xpBoostUntil > now ? wallet.xpBoostUntil : now;
          wallet = { ...wallet, xpBoostUntil: from + 24 * 60 * 60 * 1000 };
        }

        set({
          wallet,
          streak,
          inventory: state.inventory.map((i) => (i.id === id ? { ...i, consumedAt: now } : i)),
        });
      },

      buyPerk: (key) => {
        const state = get();
        const def = PERKS.find((p) => p.key === key);
        if (!def || state.unlockedPerks.includes(key)) return false;
        const available = totalAP(state.attributes) - state.spentAP;
        if (available < def.cost) return false;
        set({
          unlockedPerks: [...state.unlockedPerks, key],
          spentAP: state.spentAP + def.cost,
        });
        return true;
      },

      // --- V3 actions ------------------------------------------------------

      addArea: (name, icon, color) => {
        const state = get();
        const activeCount = state.attributeOrder.filter((k) => state.attributeDefs[k] && !state.attributeDefs[k].archived).length;
        if (activeCount >= MAX_AREAS || !name.trim()) return false;
        const key = slugifyAreaKey(name, state.attributeDefs);
        const def: AttributeDef = {
          key,
          name: name.trim(),
          description: 'A custom area you added.',
          color,
          icon,
          baseXp: 100,
          growthExp: 1.55,
          decayPctDaily: 0.005,
          custom: true,
        };
        set({
          attributeDefs: { ...state.attributeDefs, [key]: def },
          attributeOrder: [...state.attributeOrder, key],
          attributes: { ...state.attributes, [key]: createAttributeState(Date.now()) },
        });
        return true;
      },

      archiveArea: (key) => {
        const state = get();
        const def = state.attributeDefs[key];
        if (!def) return;
        const activeCount = state.attributeOrder.filter((k) => state.attributeDefs[k] && !state.attributeDefs[k].archived).length;
        if (activeCount <= 3) return; // keep the app meaningful
        set({
          attributeDefs: { ...state.attributeDefs, [key]: { ...def, archived: true } },
          profile: state.profile
            ? { ...state.profile, focusDomains: state.profile.focusDomains.filter((k) => k !== key) }
            : state.profile,
        });
      },

      addQuest: (title, description, attributeKey, difficulty, requirementCount, dueAt) => {
        const now = Date.now();
        const quest: QuestInstance = {
          id: generateId(),
          templateId: 'custom',
          type: 'custom',
          title: title.trim(),
          description: description.trim() || 'A goal you set for yourself.',
          attributeKey,
          difficulty,
          effortMinutes: EFFORT_MINUTES[difficulty],
          requirementCount: Math.max(1, requirementCount),
          progressCount: 0,
          rationale: 'You created this one. That makes it the most important kind.',
          state: 'active',
          offeredAt: now,
          acceptedAt: now,
          dueAt,
          completedAt: null,
        };
        set({ quests: [...get().quests, quest] });
      },

      updateHabit: (id, fields) => {
        set({ habits: get().habits.map((h) => (h.id === id ? { ...h, ...fields } : h)) });
      },

      updateDaily: (id, fields) => {
        set({ dailies: get().dailies.map((d) => (d.id === id ? { ...d, ...fields } : d)) });
      },

      updateReward: (id, fields) => {
        set({ rewards: get().rewards.map((r) => (r.id === id ? { ...r, ...fields } : r)) });
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== 'object' || !data.profile?.name || !data.attributes) return false;
          const current = get();
          set({
            ...current,
            ...data,
            hasHydrated: true,
            celebration: null,
          });
          return true;
        } catch {
          return false;
        }
      },

      markIntroSeen: () => set({ seenIntroVersion: 3 }),
    }),
    {
      name: 'game-life-store',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any, version) => {
        let state = persisted;
        if (version < 2) {
          state = { ...V2_DEFAULTS, ...state };
        }
        if (version < 3) {
          state = {
            ...v3Defaults(),
            ...state,
            attributeDefs: seedAttributeDefs(),
            attributeOrder: [...ATTRIBUTE_ORDER],
            lastDailySweepDate: null,
            // Existing users get the one-time "what's new" intro.
            seenIntroVersion: state.profile ? 2 : 3,
            dailies: (state.dailies ?? []).map((d: any) => ({
              ...d,
              weekdays: d.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
            })),
          };
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function selectTotalAP(state: GameStore) {
  return totalAP(state.attributes);
}

export function selectAvailableAP(state: GameStore) {
  return totalAP(state.attributes) - state.spentAP;
}
