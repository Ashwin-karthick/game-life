import { HunterRankTier, QuestInstance } from '@/types/game';

export interface EarnedTitle {
  key: string;
  name: string;
  description: string;
}

export interface Badge extends EarnedTitle {
  earned: boolean;
  icon: string;
}

const RANK_TITLES: Record<HunterRankTier, string> = {
  E: 'Awakened',
  D: 'Disciplined',
  C: 'Forged',
  B: 'Ascendant',
  A: 'Architect of Self',
  S: 'Legend',
};

export interface TitleParams {
  totalEventsLogged: number;
  anyLevelUps: boolean;
  longestStreak: number;
  hunterRankTier: HunterRankTier;
  completedQuests: QuestInstance[];
  // V2 signals (all optional so old call sites keep working)
  habitsLogged?: number;
  dailiesCompleted?: number;
  rewardsRedeemed?: number;
  challengesCleared?: number;
  legendaryItemsFound?: number;
}

/** Full badge catalog with earned/locked state — powers the achievements wall. */
export function computeBadges(params: TitleParams): Badge[] {
  const rankOrder: HunterRankTier[] = ['E', 'D', 'C', 'B', 'A', 'S'];
  const currentIndex = rankOrder.indexOf(params.hunterRankTier);

  const badges: Badge[] = [
    { key: 'first-steps', name: 'First Steps', description: 'Log your very first action.', icon: 'footsteps', earned: params.totalEventsLogged >= 1 },
    { key: 'first-level', name: 'Level Up', description: 'Reach your first attribute level-up.', icon: 'arrow-up-circle', earned: params.anyLevelUps },
    { key: 'streak-7', name: 'Week-Long Grind', description: 'Hold a 7-day streak.', icon: 'flame', earned: params.longestStreak >= 7 },
    { key: 'streak-30', name: 'Iron-Willed', description: 'Hold a 30-day streak.', icon: 'shield-checkmark', earned: params.longestStreak >= 30 },
    { key: 'quests-25', name: 'Quartermaster', description: 'Complete 25 quests.', icon: 'flag', earned: params.completedQuests.length >= 25 },
    { key: 'quests-100', name: 'Centurion', description: 'Complete 100 quests.', icon: 'medal', earned: params.completedQuests.length >= 100 },
    { key: 'habits-50', name: 'Creature of Habit', description: 'Log habits 50 times.', icon: 'repeat', earned: (params.habitsLogged ?? 0) >= 50 },
    { key: 'dailies-30', name: 'Daily Driver', description: 'Check off 30 dailies.', icon: 'checkbox', earned: (params.dailiesCompleted ?? 0) >= 30 },
    { key: 'first-reward', name: 'Treat Yourself', description: 'Redeem your first reward.', icon: 'gift', earned: (params.rewardsRedeemed ?? 0) >= 1 },
    { key: 'challenge-1', name: 'Challenger', description: 'Clear a weekly challenge.', icon: 'trophy', earned: (params.challengesCleared ?? 0) >= 1 },
    { key: 'challenge-5', name: 'Unstoppable', description: 'Clear 5 weekly challenges.', icon: 'rocket', earned: (params.challengesCleared ?? 0) >= 5 },
    { key: 'legendary-find', name: 'Legendary Find', description: 'Discover a legendary item.', icon: 'sparkles', earned: (params.legendaryItemsFound ?? 0) >= 1 },
  ];

  for (let i = 1; i < rankOrder.length; i++) {
    const tier = rankOrder[i];
    badges.push({
      key: `rank-${tier}`,
      name: `${RANK_TITLES[tier]} Hunter`,
      description: `Reach ${tier}-Rank.`,
      icon: 'star',
      earned: i <= currentIndex,
    });
  }

  return badges;
}

export function computeEarnedTitles(params: TitleParams): EarnedTitle[] {
  return computeBadges(params).filter((b) => b.earned);
}
