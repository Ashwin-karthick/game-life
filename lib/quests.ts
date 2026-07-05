import { generateId } from '@/lib/id';
import { AttributeKey, AttributeState, Difficulty, QuestInstance } from '@/types/game';

const DAY_MS = 24 * 60 * 60 * 1000;

interface DailyTemplate {
  id: string;
  attributeKey: AttributeKey;
  title: string;
  description: string;
  difficulty: Difficulty;
  effortMinutes: number;
}

interface WeeklyTemplate {
  id: string;
  attributeKey: AttributeKey;
  title: string;
  description: string;
  difficulty: Difficulty;
  effortMinutes: number;
  requirementCount: number;
}

export const DAILY_TEMPLATES: DailyTemplate[] = [
  { id: 'd-health-1', attributeKey: 'health', title: 'Move your body', description: '30 minutes of exercise, any kind.', difficulty: 'medium', effortMinutes: 30 },
  { id: 'd-health-2', attributeKey: 'health', title: 'Protect your sleep', description: 'Get to bed in time for a full night of rest.', difficulty: 'easy', effortMinutes: 15 },
  { id: 'd-intelligence-1', attributeKey: 'intelligence', title: 'Focused study block', description: '30 minutes of deep, distraction-free learning.', difficulty: 'medium', effortMinutes: 30 },
  { id: 'd-intelligence-2', attributeKey: 'intelligence', title: 'Read to grow', description: 'Read 15 focused minutes of a book or course.', difficulty: 'easy', effortMinutes: 15 },
  { id: 'd-career-1', attributeKey: 'career', title: 'Ship real work', description: 'Advance one real task on your main project.', difficulty: 'medium', effortMinutes: 45 },
  { id: 'd-career-2', attributeKey: 'career', title: 'Sharpen the craft', description: 'Spend 20 minutes learning a work-relevant skill.', difficulty: 'easy', effortMinutes: 20 },
  { id: 'd-emotion-1', attributeKey: 'emotion', title: 'Check in with yourself', description: 'Journal or reflect honestly for 10 minutes.', difficulty: 'easy', effortMinutes: 10 },
  { id: 'd-emotion-2', attributeKey: 'emotion', title: 'Reset your mind', description: '10 minutes of meditation or quiet breathing.', difficulty: 'easy', effortMinutes: 10 },
  { id: 'd-finance-1', attributeKey: 'finance', title: 'Mind your money', description: 'Review spending or move something into savings.', difficulty: 'easy', effortMinutes: 10 },
  { id: 'd-finance-2', attributeKey: 'finance', title: 'Budget check-in', description: 'Spend 15 minutes on your budget or a financial goal.', difficulty: 'medium', effortMinutes: 15 },
  { id: 'd-relationship-1', attributeKey: 'relationship', title: 'Reach out', description: 'Have a real conversation with someone you care about.', difficulty: 'easy', effortMinutes: 20 },
  { id: 'd-relationship-2', attributeKey: 'relationship', title: 'Show up for someone', description: 'Do one small act of care for a close relationship.', difficulty: 'medium', effortMinutes: 20 },
];

export const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  { id: 'w-health', attributeKey: 'health', title: 'Weekly training arc', description: 'Complete 4 workouts this week.', difficulty: 'hard', effortMinutes: 30, requirementCount: 4 },
  { id: 'w-intelligence', attributeKey: 'intelligence', title: 'Weekly learning arc', description: '4 focused study sessions this week.', difficulty: 'hard', effortMinutes: 30, requirementCount: 4 },
  { id: 'w-career', attributeKey: 'career', title: 'Weekly output arc', description: 'Ship progress on 3 separate days this week.', difficulty: 'hard', effortMinutes: 45, requirementCount: 3 },
  { id: 'w-emotion', attributeKey: 'emotion', title: 'Weekly reflection arc', description: '3 journaling or reflection sessions this week.', difficulty: 'medium', effortMinutes: 10, requirementCount: 3 },
  { id: 'w-finance', attributeKey: 'finance', title: 'Weekly discipline arc', description: '3 money check-ins this week.', difficulty: 'medium', effortMinutes: 10, requirementCount: 3 },
  { id: 'w-relationship', attributeKey: 'relationship', title: 'Weekly connection arc', description: '3 real conversations this week.', difficulty: 'medium', effortMinutes: 20, requirementCount: 3 },
];

function attributeGap(states: Record<AttributeKey, AttributeState>, key: AttributeKey): number {
  const s = states[key];
  const decayPressure = Date.now() - (s.lastActionAt ?? 0);
  return -s.level * 1000 + decayPressure / DAY_MS;
}

export function rankAttributesByLeverage(
  states: Record<AttributeKey, AttributeState>,
  focusDomains: AttributeKey[]
): AttributeKey[] {
  const keys = Object.keys(states) as AttributeKey[];
  return [...keys].sort((a, b) => {
    const focusBoostA = focusDomains.includes(a) ? 1 : 0;
    const focusBoostB = focusDomains.includes(b) ? 1 : 0;
    if (focusBoostA !== focusBoostB) return focusBoostB - focusBoostA;
    return attributeGap(states, b) - attributeGap(states, a);
  });
}

export function generateDailyOffers(
  states: Record<AttributeKey, AttributeState>,
  focusDomains: AttributeKey[],
  now: number,
  count = 4,
  allowedKeys?: AttributeKey[]
): QuestInstance[] {
  // Only built-in areas have quest templates; custom areas grow through
  // user-created quests, habits, and dailies instead.
  const priorityKeys = rankAttributesByLeverage(states, focusDomains)
    .filter((k) => DAILY_TEMPLATES.some((t) => t.attributeKey === k))
    .filter((k) => !allowedKeys || allowedKeys.includes(k))
    .slice(0, count);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return priorityKeys.map((key) => {
    const options = DAILY_TEMPLATES.filter((t) => t.attributeKey === key);
    const template = options[Math.floor(Math.random() * options.length)];
    const isFocus = focusDomains.includes(key);
    return {
      id: generateId(),
      templateId: template.id,
      type: 'daily',
      title: template.title,
      description: template.description,
      attributeKey: template.attributeKey,
      difficulty: template.difficulty,
      effortMinutes: template.effortMinutes,
      requirementCount: 1,
      progressCount: 0,
      rationale: isFocus
        ? 'Suggested because this is one of your focus domains.'
        : `Suggested because ${key} has the most leverage right now.`,
      state: 'available',
      offeredAt: now,
      acceptedAt: null,
      dueAt: endOfDay.getTime(),
      completedAt: null,
    };
  });
}

export function generateWeeklyOffers(
  states: Record<AttributeKey, AttributeState>,
  focusDomains: AttributeKey[],
  now: number,
  count = 2,
  allowedKeys?: AttributeKey[]
): QuestInstance[] {
  const priorityKeys = rankAttributesByLeverage(states, focusDomains)
    .filter((k) => WEEKLY_TEMPLATES.some((t) => t.attributeKey === k))
    .filter((k) => !allowedKeys || allowedKeys.includes(k))
    .slice(0, count);
  const dueAt = now + 7 * DAY_MS;

  return priorityKeys.map((key) => {
    const template = WEEKLY_TEMPLATES.find((t) => t.attributeKey === key)!;
    const isFocus = focusDomains.includes(key);
    return {
      id: generateId(),
      templateId: template.id,
      type: 'weekly',
      title: template.title,
      description: template.description,
      attributeKey: template.attributeKey,
      difficulty: template.difficulty,
      effortMinutes: template.effortMinutes,
      requirementCount: template.requirementCount,
      progressCount: 0,
      rationale: isFocus
        ? 'Suggested because this is one of your focus domains.'
        : `Suggested because ${key} could use sustained attention.`,
      state: 'available',
      offeredAt: now,
      acceptedAt: null,
      dueAt,
      completedAt: null,
    };
  });
}

export function generateComebackQuest(now: number): QuestInstance {
  return {
    id: generateId(),
    templateId: 'comeback',
    type: 'comeback',
    title: 'Ease back in',
    description: 'Log any one small real action today. That is the whole quest.',
    attributeKey: 'emotion',
    difficulty: 'trivial',
    effortMinutes: 5,
    requirementCount: 1,
    progressCount: 0,
    rationale: 'A gentle nudge back into motion after time away. No shame, just a fresh start.',
    state: 'available',
    offeredAt: now,
    acceptedAt: null,
    dueAt: now + 3 * DAY_MS,
    completedAt: null,
  };
}
