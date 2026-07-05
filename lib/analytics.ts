import { ATTRIBUTE_ORDER } from '@/lib/attributes';
import { todayLocalDateString } from '@/lib/progression';
import { AttributeState, ProgressionEvent } from '@/types/game';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DayBucket {
  date: string;
  label: string;
  xp: number;
  active: boolean;
}

export function getDailyXpBuckets(events: ProgressionEvent[], days: number, now = Date.now()): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayTime = now - i * DAY_MS;
    const date = todayLocalDateString(dayTime);
    const label = new Date(dayTime).toLocaleDateString(undefined, { weekday: 'short' });
    const xp = events
      .filter((e) => e.type === 'xp_grant' && todayLocalDateString(e.createdAt) === date)
      .reduce((sum, e) => sum + e.amount, 0);
    const active = events.some((e) => todayLocalDateString(e.createdAt) === date && e.type === 'xp_grant');
    buckets.push({ date, label, xp, active });
  }
  return buckets;
}

export function getActivityHeatmap(events: ProgressionEvent[], days: number, now = Date.now()): DayBucket[] {
  return getDailyXpBuckets(events, days, now);
}

export function computeBalanceIndex(attributes: Record<string, AttributeState>, keys?: string[]): number {
  const activeKeys = (keys ?? ATTRIBUTE_ORDER).filter((k) => attributes[k]);
  if (activeKeys.length === 0) return 100;
  const levels = activeKeys.map((k) => attributes[k].level);
  const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
  if (mean === 0) return 100;
  const variance = levels.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / levels.length;
  const stdev = Math.sqrt(variance);
  const coefficientOfVariation = stdev / mean;
  return Math.max(0, Math.round(100 - coefficientOfVariation * 100));
}
