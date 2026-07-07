import { AttributeDef, AttributeKey, AttributeState, BuiltinAttributeKey } from '@/types/game';

export const ATTRIBUTE_ORDER: BuiltinAttributeKey[] = [
  'health',
  'intelligence',
  'career',
  'emotion',
  'finance',
  'relationship',
];

export const ATTRIBUTE_DEFS: Record<BuiltinAttributeKey, AttributeDef> = {
  health: {
    key: 'health',
    name: 'Health',
    description: 'Fitness, sleep, nutrition, and energy.',
    color: '#F87171',
    icon: 'fitness',
    baseXp: 160,
    growthExp: 1.55,
    decayPctDaily: 0.01,
  },
  intelligence: {
    key: 'intelligence',
    name: 'Intelligence',
    description: 'Learning, focus, and problem-solving.',
    color: '#22D3EE',
    icon: 'bulb',
    baseXp: 208,
    growthExp: 1.65,
    decayPctDaily: 0.002,
  },
  career: {
    key: 'career',
    name: 'Career',
    description: 'Professional growth and output.',
    color: '#F5C451',
    icon: 'briefcase',
    baseXp: 160,
    growthExp: 1.55,
    decayPctDaily: 0.005,
  },
  emotion: {
    key: 'emotion',
    name: 'Emotion',
    description: 'Emotional regulation and resilience.',
    color: '#8B5CF6',
    icon: 'heart',
    baseXp: 160,
    growthExp: 1.55,
    decayPctDaily: 0.005,
  },
  finance: {
    key: 'finance',
    name: 'Finance',
    description: 'Saving, budgeting, and financial discipline.',
    color: '#34D399',
    icon: 'cash',
    baseXp: 160,
    growthExp: 1.55,
    decayPctDaily: 0.005,
  },
  relationship: {
    key: 'relationship',
    name: 'Relationship',
    description: 'Depth and health of close bonds.',
    color: '#FB923C',
    icon: 'people',
    baseXp: 160,
    growthExp: 1.55,
    decayPctDaily: 0.005,
  },
};

/** Maximum total areas (built-in + custom) so grids and balance stay meaningful. */
export const MAX_AREAS = 10;

/** Curated Ionicons choices for custom areas. */
export const AREA_ICON_CHOICES = [
  'sparkles',
  'book',
  'brush',
  'musical-notes',
  'code-slash',
  'earth',
  'leaf',
  'paw',
  'home',
  'car-sport',
  'game-controller',
  'camera',
  'restaurant',
  'barbell',
  'language',
  'rocket',
  'construct',
  'flower',
  'moon',
  'compass',
] as const;

/** Curated color palette for custom areas. */
export const AREA_COLOR_CHOICES = [
  '#F87171',
  '#FB923C',
  '#F5C451',
  '#34D399',
  '#2DD4BF',
  '#22D3EE',
  '#60A5FA',
  '#8B5CF6',
  '#C084FC',
  '#F472B6',
  '#A3E635',
  '#94A3B8',
] as const;

const FALLBACK_DEF: AttributeDef = {
  key: 'unknown',
  name: 'Unknown',
  description: '',
  color: '#94A3B8',
  icon: 'help',
  baseXp: 160,
  growthExp: 1.55,
  decayPctDaily: 0.005,
};

/** Crash-proof def lookup — archived or deleted keys render gracefully. */
export function resolveDef(defs: Record<string, AttributeDef>, key: AttributeKey | undefined): AttributeDef {
  if (key && defs[key]) return defs[key];
  return FALLBACK_DEF;
}

export function createAttributeState(now: number): AttributeState {
  return {
    level: 1,
    xpBuffer: 0,
    totalAP: 0,
    lastDecayAt: now,
    lastActionAt: null,
  };
}

export function createInitialAttributeState(now: number): Record<AttributeKey, AttributeState> {
  const state = {} as Record<AttributeKey, AttributeState>;
  for (const key of ATTRIBUTE_ORDER) {
    state[key] = createAttributeState(now);
  }
  return state;
}

export function seedAttributeDefs(): Record<string, AttributeDef> {
  return { ...ATTRIBUTE_DEFS };
}
