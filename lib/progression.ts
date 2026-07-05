import { AttributeDef, AttributeState, Difficulty, HunterRankInfo, HunterRankTier, StreakState } from '@/types/game';

const DAY_MS = 24 * 60 * 60 * 1000;
const MULTIPLIER_CAP = 3.0;

export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  trivial: 1.0,
  easy: 1.5,
  medium: 2.5,
  hard: 4,
  epic: 5,
};

export function effortMinutesFactor(minutes: number): number {
  const raw = 0.5 + Math.log2(1 + minutes / 15);
  return Math.min(3.0, Math.max(0.5, raw));
}

export function streakMultiplier(currentLen: number): number {
  return Math.min(1.3, 1 + 0.01 * Math.max(0, currentLen));
}

export function xpToNextLevel(level: number, def: Pick<AttributeDef, 'baseXp' | 'growthExp'>): number {
  return Math.round(def.baseXp * Math.pow(level, def.growthExp));
}

export function apTierForLevel(level: number): number {
  return Math.floor(level / 10) + 1;
}

export function baseActionXp(difficulty: Difficulty, minutes: number, rarityBonus = 1.0): number {
  return DIFFICULTY_WEIGHT[difficulty] * effortMinutesFactor(minutes) * rarityBonus;
}

export interface LevelUpResult {
  newLevel: number;
  apGained: number;
}

export interface ApplyXpResult {
  state: AttributeState;
  finalXp: number;
  levelUps: LevelUpResult[];
}

export function applyXpGrant(
  state: AttributeState,
  def: Pick<AttributeDef, 'baseXp' | 'growthExp'>,
  baseXp: number,
  currentStreakLen: number,
  now: number
): ApplyXpResult {
  const multiplier = Math.min(MULTIPLIER_CAP, streakMultiplier(currentStreakLen));
  const finalXp = Math.round(baseXp * multiplier);

  let { level, xpBuffer, totalAP } = state;
  xpBuffer += finalXp;
  const levelUps: LevelUpResult[] = [];

  let threshold = xpToNextLevel(level, def);
  while (xpBuffer >= threshold) {
    xpBuffer -= threshold;
    level += 1;
    const apGained = apTierForLevel(level);
    totalAP += apGained;
    levelUps.push({ newLevel: level, apGained });
    threshold = xpToNextLevel(level, def);
  }

  return {
    state: {
      ...state,
      level,
      xpBuffer,
      totalAP,
      lastActionAt: now,
    },
    finalXp,
    levelUps,
  };
}

export function applyDecay(
  state: AttributeState,
  def: Pick<AttributeDef, 'decayPctDaily'>,
  now: number
): { state: AttributeState; decayedAmount: number } {
  const elapsedDays = Math.floor((now - state.lastDecayAt) / DAY_MS);
  if (elapsedDays <= 0 || state.xpBuffer <= 0) {
    return { state, decayedAmount: 0 };
  }
  const retained = Math.pow(1 - def.decayPctDaily, elapsedDays);
  const newBuffer = Math.floor(state.xpBuffer * retained);
  const decayedAmount = state.xpBuffer - newBuffer;
  return {
    state: {
      ...state,
      xpBuffer: newBuffer,
      lastDecayAt: state.lastDecayAt + elapsedDays * DAY_MS,
    },
    decayedAmount,
  };
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayLocalDateString(now: number): string {
  return toLocalDateString(new Date(now));
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export interface StreakUpdateResult {
  streak: StreakState;
  brokeStreak: boolean;
  freezeTokenAwarded: boolean;
}

export function updateStreakOnAction(streak: StreakState, now: number): StreakUpdateResult {
  const today = todayLocalDateString(now);
  if (streak.lastActiveDate === today) {
    return { streak, brokeStreak: false, freezeTokenAwarded: false };
  }

  let currentLen: number;
  let brokeStreak = false;

  if (streak.lastActiveDate === null) {
    currentLen = 1;
  } else {
    const gap = daysBetween(streak.lastActiveDate, today);
    const missedDays = gap - 1;
    if (missedDays <= 0) {
      currentLen = streak.currentLen + 1;
    } else if (missedDays <= streak.freezeTokens) {
      currentLen = streak.currentLen + 1;
      streak = { ...streak, freezeTokens: streak.freezeTokens - missedDays };
    } else {
      currentLen = 1;
      brokeStreak = true;
    }
  }

  let freezeTokenAwarded = false;
  let freezeTokens = streak.freezeTokens;
  if (currentLen > 0 && currentLen % 14 === 0 && freezeTokens < 2) {
    freezeTokens += 1;
    freezeTokenAwarded = true;
  }

  return {
    streak: {
      currentLen,
      longestLen: Math.max(streak.longestLen, currentLen),
      lastActiveDate: today,
      freezeTokens,
    },
    brokeStreak,
    freezeTokenAwarded,
  };
}

export function isStreakStaleToday(streak: StreakState, now: number): boolean {
  if (!streak.lastActiveDate) return false;
  const today = todayLocalDateString(now);
  if (streak.lastActiveDate === today) return false;
  const gap = daysBetween(streak.lastActiveDate, today);
  const missedDays = gap - 1;
  return missedDays > streak.freezeTokens;
}

const HUNTER_RANK_BANDS: { tier: HunterRankTier; title: string; min: number }[] = [
  { tier: 'E', title: 'Awakened Hunter', min: 0 },
  { tier: 'D', title: 'Disciplined Hunter', min: 50 },
  { tier: 'C', title: 'Forged Hunter', min: 150 },
  { tier: 'B', title: 'Ascendant Hunter', min: 350 },
  { tier: 'A', title: 'Architect Hunter', min: 700 },
  { tier: 'S', title: 'Legendary Hunter', min: 1500 },
];

export function computeHunterRank(totalAP: number): HunterRankInfo {
  let current = HUNTER_RANK_BANDS[0];
  let next: (typeof HUNTER_RANK_BANDS)[number] | undefined;
  for (let i = 0; i < HUNTER_RANK_BANDS.length; i++) {
    if (totalAP >= HUNTER_RANK_BANDS[i].min) {
      current = HUNTER_RANK_BANDS[i];
      next = HUNTER_RANK_BANDS[i + 1];
    }
  }
  return {
    tier: current.tier,
    title: current.title,
    totalAP,
    currentMin: current.min,
    nextThreshold: next ? next.min : null,
  };
}
