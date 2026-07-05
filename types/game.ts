/**
 * V3: attribute keys are open strings — six built-ins plus user-created areas.
 * Definitions live in the store (attributeDefs / attributeOrder).
 */
export type AttributeKey = string;

export type BuiltinAttributeKey =
  | 'health'
  | 'intelligence'
  | 'career'
  | 'emotion'
  | 'finance'
  | 'relationship';

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'epic';

export interface AttributeDef {
  key: AttributeKey;
  name: string;
  description: string;
  color: string;
  icon: string;
  baseXp: number;
  growthExp: number;
  decayPctDaily: number;
  /** True for user-created areas. */
  custom?: boolean;
  /** Hidden from grids and pickers; history preserved. */
  archived?: boolean;
}

export interface AttributeState {
  level: number;
  xpBuffer: number;
  totalAP: number;
  lastDecayAt: number;
  lastActionAt: number | null;
}

export type EventType =
  | 'xp_grant'
  | 'ap_grant'
  | 'decay'
  | 'quest_complete'
  | 'quest_partial'
  | 'habit_slip'
  | 'daily_miss'
  | 'reward_redeem'
  | 'loot_drop'
  | 'challenge_clear';

export interface ProgressionEvent {
  id: string;
  type: EventType;
  attributeKey?: AttributeKey;
  amount: number;
  note: string;
  questId?: string;
  createdAt: number;
}

export type QuestType = 'daily' | 'weekly' | 'main' | 'comeback' | 'custom';
export type QuestState = 'available' | 'active' | 'completed' | 'failed' | 'abandoned';

export interface QuestInstance {
  id: string;
  templateId: string;
  type: QuestType;
  title: string;
  description: string;
  attributeKey: AttributeKey;
  difficulty: Difficulty;
  effortMinutes: number;
  requirementCount: number;
  progressCount: number;
  rationale: string;
  state: QuestState;
  offeredAt: number;
  acceptedAt: number | null;
  dueAt: number | null;
  completedAt: number | null;
}

export interface StreakState {
  currentLen: number;
  longestLen: number;
  lastActiveDate: string | null;
  freezeTokens: number;
}

export interface ProfileState {
  name: string;
  createdAt: number;
  focusDomains: AttributeKey[];
}

export interface SettingsState {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export type HunterRankTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface HunterRankInfo {
  tier: HunterRankTier;
  title: string;
  totalAP: number;
  currentMin: number;
  nextThreshold: number | null;
}

// ---------------------------------------------------------------------------
// V2: economy, habits, dailies, rewards, loot, weekly challenge, perks
// ---------------------------------------------------------------------------

export interface WalletState {
  gems: number;
  /** Timestamp until which an XP booster item is active, or null. */
  xpBoostUntil: number | null;
}

export type HabitPolarity = 'good' | 'bad';

export interface Habit {
  id: string;
  title: string;
  /** 'good' = something to do more of, 'bad' = something to do less of. */
  polarity: HabitPolarity;
  attributeKey: AttributeKey;
  difficulty: Difficulty;
  createdAt: number;
  archived: boolean;
  /** Local date strings of days this habit was logged (trimmed to recent). */
  logDates: string[];
  totalLogs: number;
}

export interface DailyTask {
  id: string;
  title: string;
  attributeKey: AttributeKey;
  difficulty: Difficulty;
  createdAt: number;
  archived: boolean;
  /** Local date strings of days this daily was checked off (trimmed to recent). */
  completedDates: string[];
  /** Scheduled weekdays, JS getDay() convention (0 = Sunday). Default: every day. */
  weekdays: number[];
}

export interface RewardDef {
  id: string;
  title: string;
  cost: number;
  createdAt: number;
}

export type LootKind = 'gem_cache' | 'streak_freeze' | 'xp_booster' | 'artifact';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface InventoryItem {
  id: string;
  kind: LootKind;
  rarity: Rarity;
  name: string;
  description: string;
  obtainedAt: number;
  consumedAt: number | null;
  /** Gems granted when a gem_cache is opened. */
  gemValue?: number;
}

export type ChallengeState = 'active' | 'cleared' | 'failed';

export interface WeeklyChallenge {
  weekKey: string;
  title: string;
  description: string;
  targetXp: number;
  progressXp: number;
  state: ChallengeState;
  gemReward: number;
  clearedAt: number | null;
}

export type PerkEffect = 'attr_xp' | 'drop_chance' | 'gem_bonus' | 'freeze_cap';

export interface PerkDef {
  key: string;
  name: string;
  description: string;
  cost: number;
  effect: PerkEffect;
  attributeKey?: AttributeKey;
}
