import { generateId } from '@/lib/id';
import { todayLocalDateString } from '@/lib/progression';
import {
  InventoryItem,
  LootKind,
  PerkDef,
  ProgressionEvent,
  Rarity,
  WeeklyChallenge,
} from '@/types/game';

const DAY_MS = 24 * 60 * 60 * 1000;

// --- Gems ------------------------------------------------------------------

/** Gems earned alongside an XP grant. */
export function gemsForXp(finalXp: number): number {
  return Math.max(1, Math.round(finalXp / 2));
}

// --- Weekly challenge --------------------------------------------------------

/** Monday-based week key like "2026-W27", using local time. */
export function weekKeyFor(now: number): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // Shift to the Thursday of this week to get an ISO-style week number.
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Target scales with the user's own recent pace so the challenge is always
 * "a bit more than usual", never crushing for beginners.
 */
export function generateWeeklyChallenge(events: ProgressionEvent[], now: number): WeeklyChallenge {
  const twoWeeksAgo = now - 14 * DAY_MS;
  const recentXp = events
    .filter((e) => e.type === 'xp_grant' && e.createdAt >= twoWeeksAgo)
    .reduce((sum, e) => sum + e.amount, 0);
  const weeklyPace = recentXp / 2;
  const target = Math.min(30000, Math.max(1000, Math.round((weeklyPace * 1.15) / 100) * 100));

  return {
    weekKey: weekKeyFor(now),
    title: 'Weekly Challenge',
    description: `Earn ${target} XP before the week ends.`,
    targetXp: target,
    progressXp: 0,
    state: 'active',
    gemReward: Math.round(target / 2),
    clearedAt: null,
  };
}

// --- Loot --------------------------------------------------------------------

export const DROP_CHANCE = {
  quest: 0.35,
  daily: 0.15,
  habit: 0.08,
};

export const RARITY_COLOR_KEY: Record<Rarity, Rarity> = {
  common: 'common',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
};

const RARITY_TABLE: { rarity: Rarity; weight: number }[] = [
  { rarity: 'common', weight: 60 },
  { rarity: 'rare', weight: 25 },
  { rarity: 'epic', weight: 12 },
  { rarity: 'legendary', weight: 3 },
];

const GEM_CACHE_VALUE: Record<Rarity, number> = {
  common: 150,
  rare: 400,
  epic: 1000,
  legendary: 2500,
};

const ARTIFACT_NAMES: Record<Rarity, string[]> = {
  common: ['Glow Shard', 'Circuit Leaf', 'Echo Pebble'],
  rare: ['Neon Compass', 'Pulse Crystal', 'Hologram Rose'],
  epic: ['Void Lantern', 'Aurora Core', 'Chrono Dial'],
  legendary: ['Shadow Wolf Companion', 'Phoenix Ember Companion', 'Starlight Drake Companion'],
};

function pickRarity(roll: number): Rarity {
  const total = RARITY_TABLE.reduce((s, r) => s + r.weight, 0);
  let cursor = roll * total;
  for (const entry of RARITY_TABLE) {
    if (cursor < entry.weight) return entry.rarity;
    cursor -= entry.weight;
  }
  return 'common';
}

/**
 * Rolls for a loot drop. Returns null on a miss.
 * `chance` is 0..1; rng injectable for tests.
 */
export function rollLoot(chance: number, now: number, rng: () => number = Math.random): InventoryItem | null {
  if (rng() > chance) return null;

  const rarity = pickRarity(rng());
  // What kind of item: gem caches are the bread and butter; the rest are treats.
  const kindRoll = rng();
  let kind: LootKind;
  if (rarity === 'legendary') {
    kind = kindRoll < 0.5 ? 'artifact' : 'gem_cache';
  } else if (kindRoll < 0.5) {
    kind = 'gem_cache';
  } else if (kindRoll < 0.7 && rarity !== 'common') {
    kind = 'streak_freeze';
  } else if (kindRoll < 0.85 && (rarity === 'epic' || rarity === 'rare')) {
    kind = 'xp_booster';
  } else {
    kind = 'artifact';
  }

  const base = { id: generateId(), rarity, obtainedAt: now, consumedAt: null };
  switch (kind) {
    case 'gem_cache':
      return {
        ...base,
        kind,
        name: rarity === 'common' ? 'Gem Pouch' : rarity === 'rare' ? 'Gem Case' : rarity === 'epic' ? 'Gem Chest' : 'Gem Vault',
        description: `Open to receive ${GEM_CACHE_VALUE[rarity]} gems.`,
        gemValue: GEM_CACHE_VALUE[rarity],
      };
    case 'streak_freeze':
      return {
        ...base,
        kind,
        name: 'Streak Shield',
        description: 'Use to add a streak freeze — it protects your streak for one missed day.',
      };
    case 'xp_booster':
      return {
        ...base,
        kind,
        name: 'Focus Charge',
        description: 'Use to earn +20% XP on everything for the next 24 hours.',
      };
    case 'artifact': {
      const names = ARTIFACT_NAMES[rarity];
      return {
        ...base,
        kind,
        name: names[Math.floor(rng() * names.length)],
        description:
          rarity === 'legendary'
            ? 'A legendary companion for your collection. Only real effort finds these.'
            : 'A collectible for your collection.',
      };
    }
  }
}

// --- Perks -------------------------------------------------------------------

export const PERKS: PerkDef[] = [
  { key: 'xp_health', name: 'Health Boost', description: '+10% XP from all Health activity.', cost: 5, effect: 'attr_xp', attributeKey: 'health' },
  { key: 'xp_intelligence', name: 'Mind Boost', description: '+10% XP from all Intelligence activity.', cost: 5, effect: 'attr_xp', attributeKey: 'intelligence' },
  { key: 'xp_career', name: 'Career Boost', description: '+10% XP from all Career activity.', cost: 5, effect: 'attr_xp', attributeKey: 'career' },
  { key: 'xp_emotion', name: 'Calm Boost', description: '+10% XP from all Emotion activity.', cost: 5, effect: 'attr_xp', attributeKey: 'emotion' },
  { key: 'xp_finance', name: 'Money Boost', description: '+10% XP from all Finance activity.', cost: 5, effect: 'attr_xp', attributeKey: 'finance' },
  { key: 'xp_relationship', name: 'Connection Boost', description: '+10% XP from all Relationship activity.', cost: 5, effect: 'attr_xp', attributeKey: 'relationship' },
  { key: 'lucky_finder', name: 'Lucky Finder', description: 'Items drop 50% more often.', cost: 8, effect: 'drop_chance' },
  { key: 'gem_magnet', name: 'Gem Magnet', description: 'Earn 25% more gems from everything.', cost: 8, effect: 'gem_bonus' },
  { key: 'deep_freeze', name: 'Deep Freeze', description: 'Hold up to 3 streak freezes instead of 2.', cost: 6, effect: 'freeze_cap' },
];

export function xpPerkMultiplier(unlockedPerks: string[], attributeKey: string): number {
  return unlockedPerks.includes(`xp_${attributeKey}`) ? 1.1 : 1;
}

export function gemMultiplier(unlockedPerks: string[]): number {
  return unlockedPerks.includes('gem_magnet') ? 1.25 : 1;
}

export function effectiveDropChance(base: number, unlockedPerks: string[]): number {
  return unlockedPerks.includes('lucky_finder') ? base * 1.5 : base;
}

export function freezeTokenCap(unlockedPerks: string[]): number {
  return unlockedPerks.includes('deep_freeze') ? 3 : 2;
}

// --- Daily briefing ------------------------------------------------------------

export interface BriefingLine {
  icon: string;
  text: string;
  tone: 'good' | 'warn' | 'neutral';
}

export function buildBriefing(params: {
  now: number;
  name: string;
  streakLen: number;
  activeToday: boolean;
  weakestAttributeName: string | null;
  challenge: WeeklyChallenge | null;
  dailiesRemaining: number;
  dailiesTotal: number;
}): { greeting: string; lines: BriefingLine[] } {
  const hour = new Date(params.now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const lines: BriefingLine[] = [];

  if (params.activeToday) {
    lines.push({ icon: 'checkmark-circle', text: "You've already shown up today. Nice.", tone: 'good' });
  } else if (params.streakLen > 0) {
    lines.push({
      icon: 'flame',
      text: `Your ${params.streakLen}-day streak is on the line — one small action keeps it.`,
      tone: 'warn',
    });
  } else {
    lines.push({ icon: 'sunny', text: 'A fresh start. One small action gets things moving.', tone: 'neutral' });
  }

  if (params.dailiesTotal > 0) {
    lines.push(
      params.dailiesRemaining === 0
        ? { icon: 'checkbox', text: 'All dailies done for today.', tone: 'good' }
        : {
            icon: 'checkbox',
            text: `${params.dailiesRemaining} of ${params.dailiesTotal} dailies still open today.`,
            tone: 'neutral',
          }
    );
  }

  if (params.weakestAttributeName) {
    lines.push({
      icon: 'trending-up',
      text: `${params.weakestAttributeName} could use some attention — it's your quietest area lately.`,
      tone: 'neutral',
    });
  }

  if (params.challenge && params.challenge.state === 'active') {
    const remaining = Math.max(0, params.challenge.targetXp - params.challenge.progressXp);
    lines.push(
      remaining === 0
        ? { icon: 'trophy', text: 'Weekly challenge cleared!', tone: 'good' }
        : { icon: 'trophy', text: `${remaining} XP left on this week's challenge.`, tone: 'neutral' }
    );
  }

  return { greeting, lines };
}

/** Trim a date-string list to the last `keep` entries (storage hygiene). */
export function trimDates(dates: string[], keep = 60): string[] {
  return dates.length > keep ? dates.slice(dates.length - keep) : dates;
}

/** Consecutive-day combo ending today or yesterday (grace so it shows during the day). */
export function comboLength(logDates: string[], now: number): number {
  if (logDates.length === 0) return 0;
  const set = new Set(logDates);
  let combo = 0;
  let cursor = now;
  // Allow starting from today or yesterday.
  if (!set.has(todayLocalDateString(cursor))) {
    cursor -= DAY_MS;
    if (!set.has(todayLocalDateString(cursor))) return 0;
  }
  while (set.has(todayLocalDateString(cursor))) {
    combo += 1;
    cursor -= DAY_MS;
  }
  return combo;
}
