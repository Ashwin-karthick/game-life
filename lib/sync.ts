import { confirmDestructive } from '@/lib/confirm';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { GameStore, RemoteSnapshot, useGameStore } from '@/store/gameStore';
import {
  AttributeDef,
  AttributeState,
  DailyTask,
  Habit,
  InventoryItem,
  ProgressionEvent,
  QuestInstance,
  RewardDef,
  WeeklyChallenge,
} from '@/types/game';

/**
 * v1 scope boundary: sync is push-only while signed in. Pulling only ever
 * happens once, right at sign-in/sign-up time (see reconcileAfterAuth).
 * There is no live multi-device merge or realtime subscription — for a
 * single-user personal progression app that's the right tradeoff. Real
 * conflict resolution (Supabase Realtime, per-field last-write-wins) is a
 * future improvement, not a v1 requirement.
 */

const DEBOUNCE_MS = 1500;

// --- Local -> remote row mapping ------------------------------------------

function profileToRow(userId: string, s: GameStore) {
  return {
    id: userId,
    name: s.profile!.name,
    created_at: s.profile!.createdAt,
    focus_domains: s.profile!.focusDomains,
    attribute_order: s.attributeOrder,
    unlocked_perks: s.unlockedPerks,
    streak_current_len: s.streak.currentLen,
    streak_longest_len: s.streak.longestLen,
    streak_last_active_date: s.streak.lastActiveDate,
    streak_freeze_tokens: s.streak.freezeTokens,
    reminder_enabled: s.settings.reminderEnabled,
    reminder_hour: s.settings.reminderHour,
    reminder_minute: s.settings.reminderMinute,
    haptics_enabled: s.settings.hapticsEnabled,
    wallet_gems: s.wallet.gems,
    wallet_xp_boost_until: s.wallet.xpBoostUntil,
    spent_ap: s.spentAP,
    last_daily_sweep_date: s.lastDailySweepDate,
    seen_intro_version: s.seenIntroVersion,
    updated_at: new Date().toISOString(),
  };
}

function attributeDefsToRows(userId: string, s: GameStore) {
  return Object.values(s.attributeDefs).map((d) => ({
    user_id: userId,
    key: d.key,
    name: d.name,
    description: d.description,
    color: d.color,
    icon: d.icon,
    base_xp: d.baseXp,
    growth_exp: d.growthExp,
    decay_pct_daily: d.decayPctDaily,
    custom: !!d.custom,
    archived: !!d.archived,
  }));
}

function attributeStatesToRows(userId: string, s: GameStore) {
  return Object.entries(s.attributes).map(([key, st]) => ({
    user_id: userId,
    attribute_key: key,
    level: st.level,
    xp_buffer: st.xpBuffer,
    total_ap: st.totalAP,
    last_decay_at: st.lastDecayAt,
    last_action_at: st.lastActionAt,
  }));
}

function questsToRows(userId: string, s: GameStore) {
  return s.quests.map((q) => ({
    id: q.id,
    user_id: userId,
    template_id: q.templateId,
    type: q.type,
    title: q.title,
    description: q.description,
    attribute_key: q.attributeKey,
    difficulty: q.difficulty,
    effort_minutes: q.effortMinutes,
    requirement_count: q.requirementCount,
    progress_count: q.progressCount,
    rationale: q.rationale,
    state: q.state,
    offered_at: q.offeredAt,
    accepted_at: q.acceptedAt,
    due_at: q.dueAt,
    completed_at: q.completedAt,
  }));
}

function habitsToRows(userId: string, s: GameStore) {
  return s.habits.map((h) => ({
    id: h.id,
    user_id: userId,
    title: h.title,
    polarity: h.polarity,
    attribute_key: h.attributeKey,
    difficulty: h.difficulty,
    created_at: h.createdAt,
    archived: h.archived,
    log_dates: h.logDates,
    total_logs: h.totalLogs,
  }));
}

function dailiesToRows(userId: string, s: GameStore) {
  return s.dailies.map((d) => ({
    id: d.id,
    user_id: userId,
    title: d.title,
    attribute_key: d.attributeKey,
    difficulty: d.difficulty,
    created_at: d.createdAt,
    archived: d.archived,
    completed_dates: d.completedDates,
    weekdays: d.weekdays,
  }));
}

function rewardsToRows(userId: string, s: GameStore) {
  return s.rewards.map((r) => ({
    id: r.id,
    user_id: userId,
    title: r.title,
    cost: r.cost,
    created_at: r.createdAt,
  }));
}

function inventoryToRows(userId: string, s: GameStore) {
  return s.inventory.map((i) => ({
    id: i.id,
    user_id: userId,
    kind: i.kind,
    rarity: i.rarity,
    name: i.name,
    description: i.description,
    obtained_at: i.obtainedAt,
    consumed_at: i.consumedAt,
    gem_value: i.gemValue ?? null,
  }));
}

function challengeToRow(userId: string, c: WeeklyChallenge) {
  return {
    user_id: userId,
    week_key: c.weekKey,
    title: c.title,
    description: c.description,
    target_xp: c.targetXp,
    progress_xp: c.progressXp,
    state: c.state,
    gem_reward: c.gemReward,
    cleared_at: c.clearedAt,
  };
}

async function upsertIfAny(table: string, rows: object[], onConflict?: string) {
  if (rows.length === 0) return { error: null as { message: string } | null };
  const { error } = await supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
  return { error };
}

/**
 * Pushes everything except `events` (which has its own incremental cursor,
 * see pushNewEvents) to Supabase. Safe to call repeatedly — every table is
 * upserted by primary key. Never throws; failures are reflected in the
 * returned boolean so callers can set sync status without crashing.
 */
export async function pushSnapshot(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const s = useGameStore.getState();
  if (!s.profile) return true; // nothing to push yet — still in onboarding

  try {
    const results = await Promise.allSettled([
      supabase.from('profiles').upsert(profileToRow(userId, s)),
      upsertIfAny('attribute_defs', attributeDefsToRows(userId, s), 'user_id,key'),
      upsertIfAny('attribute_states', attributeStatesToRows(userId, s), 'user_id,attribute_key'),
      upsertIfAny('quests', questsToRows(userId, s)),
      upsertIfAny('habits', habitsToRows(userId, s)),
      upsertIfAny('dailies', dailiesToRows(userId, s)),
      upsertIfAny('rewards', rewardsToRows(userId, s)),
      upsertIfAny('inventory', inventoryToRows(userId, s)),
      s.challenge
        ? supabase.from('weekly_challenges').upsert(challengeToRow(userId, s.challenge), { onConflict: 'user_id,week_key' })
        : Promise.resolve({ error: null }),
    ]);
    return results.every((r) => r.status === 'fulfilled' && !(r.value as { error: unknown } | undefined)?.error);
  } catch {
    return false;
  }
}

/**
 * Finds the events not yet pushed, using the compound {id, timestamp} cursor.
 * Locating the cursor event's exact array position (rather than just filtering
 * by timestamp) correctly handles same-millisecond sibling events, like a
 * level-up's paired xp_grant + ap_grant. Falls back to a timestamp filter only
 * if the cursor event itself has since been trimmed out of the local array.
 */
function unsyncedEvents(events: ProgressionEvent[], cursorId: string | null, cursorTimestamp: number | null): ProgressionEvent[] {
  if (cursorId) {
    const idx = events.findIndex((e) => e.id === cursorId);
    if (idx !== -1) return events.slice(idx + 1);
  }
  if (cursorTimestamp !== null) {
    return events.filter((e) => e.createdAt > cursorTimestamp);
  }
  return events;
}

/** Inserts only the events appended since the last sync, using the compound cursor. */
export async function pushNewEvents(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const events = useGameStore.getState().events;
  const authStore = useAuthStore.getState();
  const toPush = unsyncedEvents(events, authStore.lastSyncedEventId, authStore.lastSyncedEventTimestamp);
  if (toPush.length === 0) return;

  const newRows = toPush.map((e) => ({
    id: e.id,
    user_id: userId,
    type: e.type,
    attribute_key: e.attributeKey ?? null,
    amount: e.amount,
    note: e.note,
    quest_id: e.questId ?? null,
    created_at: e.createdAt,
  }));

  try {
    const { error } = await supabase.from('progression_events').upsert(newRows, { onConflict: 'id', ignoreDuplicates: true });
    if (!error) {
      const last = toPush[toPush.length - 1];
      authStore.setLastSyncedEventCursor(last.id, last.createdAt);
    }
  } catch {
    // Leave the cursor where it was — the next tick retries these same events.
  }
}

// --- Remote -> local row mapping -------------------------------------------

/** Returns null if this account has no cloud data yet (nothing to pull). */
export async function pullSnapshot(userId: string): Promise<RemoteSnapshot | null> {
  if (!isSupabaseConfigured) return null;

  const profileRes = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (profileRes.error || !profileRes.data) return null;
  const p = profileRes.data;

  const [defsRes, statesRes, eventsRes, questsRes, habitsRes, dailiesRes, rewardsRes, inventoryRes, challengeRes] =
    await Promise.all([
      supabase.from('attribute_defs').select('*').eq('user_id', userId),
      supabase.from('attribute_states').select('*').eq('user_id', userId),
      supabase.from('progression_events').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('quests').select('*').eq('user_id', userId),
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase.from('dailies').select('*').eq('user_id', userId),
      supabase.from('rewards').select('*').eq('user_id', userId),
      supabase.from('inventory').select('*').eq('user_id', userId),
      supabase
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const attributeDefs: Record<string, AttributeDef> = {};
  for (const row of defsRes.data ?? []) {
    attributeDefs[row.key] = {
      key: row.key,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      baseXp: row.base_xp,
      growthExp: row.growth_exp,
      decayPctDaily: row.decay_pct_daily,
      custom: row.custom,
      archived: row.archived,
    };
  }

  const attributes: Record<string, AttributeState> = {};
  for (const row of statesRes.data ?? []) {
    attributes[row.attribute_key] = {
      level: row.level,
      xpBuffer: row.xp_buffer,
      totalAP: row.total_ap,
      lastDecayAt: row.last_decay_at,
      lastActionAt: row.last_action_at,
    };
  }

  const events: ProgressionEvent[] = (eventsRes.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    attributeKey: row.attribute_key ?? undefined,
    amount: row.amount,
    note: row.note,
    questId: row.quest_id ?? undefined,
    createdAt: row.created_at,
  }));

  const quests: QuestInstance[] = (questsRes.data ?? []).map((row) => ({
    id: row.id,
    templateId: row.template_id,
    type: row.type,
    title: row.title,
    description: row.description,
    attributeKey: row.attribute_key,
    difficulty: row.difficulty,
    effortMinutes: row.effort_minutes,
    requirementCount: row.requirement_count,
    progressCount: row.progress_count,
    rationale: row.rationale,
    state: row.state,
    offeredAt: row.offered_at,
    acceptedAt: row.accepted_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
  }));

  const habits: Habit[] = (habitsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    polarity: row.polarity,
    attributeKey: row.attribute_key,
    difficulty: row.difficulty,
    createdAt: row.created_at,
    archived: row.archived,
    logDates: row.log_dates ?? [],
    totalLogs: row.total_logs,
  }));

  const dailies: DailyTask[] = (dailiesRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    attributeKey: row.attribute_key,
    difficulty: row.difficulty,
    createdAt: row.created_at,
    archived: row.archived,
    completedDates: row.completed_dates ?? [],
    weekdays: row.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
  }));

  const rewards: RewardDef[] = (rewardsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    cost: row.cost,
    createdAt: row.created_at,
  }));

  const inventory: InventoryItem[] = (inventoryRes.data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    rarity: row.rarity,
    name: row.name,
    description: row.description,
    obtainedAt: row.obtained_at,
    consumedAt: row.consumed_at,
    gemValue: row.gem_value ?? undefined,
  }));

  const challenge: WeeklyChallenge | null = challengeRes.data
    ? {
        weekKey: challengeRes.data.week_key,
        title: challengeRes.data.title,
        description: challengeRes.data.description,
        targetXp: challengeRes.data.target_xp,
        progressXp: challengeRes.data.progress_xp,
        state: challengeRes.data.state,
        gemReward: challengeRes.data.gem_reward,
        clearedAt: challengeRes.data.cleared_at,
      }
    : null;

  return {
    profile: { name: p.name, createdAt: p.created_at, focusDomains: p.focus_domains ?? [] },
    attributeOrder: p.attribute_order ?? [],
    unlockedPerks: p.unlocked_perks ?? [],
    streak: {
      currentLen: p.streak_current_len,
      longestLen: p.streak_longest_len,
      lastActiveDate: p.streak_last_active_date,
      freezeTokens: p.streak_freeze_tokens,
    },
    settings: {
      reminderEnabled: p.reminder_enabled,
      reminderHour: p.reminder_hour,
      reminderMinute: p.reminder_minute,
      hapticsEnabled: p.haptics_enabled ?? true,
    },
    wallet: { gems: p.wallet_gems, xpBoostUntil: p.wallet_xp_boost_until },
    spentAP: p.spent_ap,
    lastDailySweepDate: p.last_daily_sweep_date,
    seenIntroVersion: p.seen_intro_version,
    attributeDefs,
    attributes,
    events,
    quests,
    habits,
    dailies,
    rewards,
    inventory,
    challenge,
    updatedAt: p.updated_at,
  };
}

// --- Guest -> account linking ------------------------------------------------

/** The cursor a freshly-hydrated local array is already fully synced up to. */
function cursorForHydratedEvents(events: ProgressionEvent[]): { id: string | null; timestamp: number | null } {
  if (events.length === 0) return { id: null, timestamp: null };
  const last = events[events.length - 1];
  return { id: last.id, timestamp: last.createdAt };
}

function localActivityHint(events: ProgressionEvent[], createdAt: number): string {
  if (events.length === 0) return `since it was set up on ${new Date(createdAt).toLocaleDateString()}`;
  const latest = events.reduce((max, e) => Math.max(max, e.createdAt), 0);
  return `as recently as ${new Date(latest).toLocaleString()}`;
}

/**
 * Call once, right after a successful interactive sign-in or sign-up (not on
 * session restoration at app boot — see startSyncEngine for that path).
 * Decides whether to pull cloud data, push local data, or ask the user to
 * choose when both sides have real data.
 */
export async function reconcileAfterAuth(userId: string): Promise<void> {
  const authStore = useAuthStore.getState();
  authStore.setSyncStatus('syncing');

  try {
    const remote = await pullSnapshot(userId);
    const local = useGameStore.getState();
    const hasLocalProfile = local.profile !== null;

    if (!hasLocalProfile) {
      if (remote) {
        local.hydrateFromRemote(remote);
        const cursor = cursorForHydratedEvents(remote.events);
        authStore.setLastSyncedEventCursor(cursor.id, cursor.timestamp);
      }
      // else: brand-new account, no local profile either — proceed to onboarding as normal.
      authStore.setSyncStatus('synced');
      authStore.setLastSyncedAt(Date.now());
      return;
    }

    if (!remote) {
      // Claim this account with the current local (guest) data.
      const ok = await pushSnapshot(userId);
      authStore.setSyncStatus(ok ? 'synced' : 'error');
      if (ok) authStore.setLastSyncedAt(Date.now());
      return;
    }

    // Both sides have real data — the human decides, not a silent auto-merge.
    confirmDestructive(
      'This account already has saved data',
      `Your account's cloud backup was last updated ${new Date(remote.updatedAt).toLocaleString()}. This device has activity ${localActivityHint(local.events, local.profile!.createdAt)}. Signing in will replace what's on this device with your account's data.`,
      'Use Cloud Data',
      () => {
        local.hydrateFromRemote(remote);
        const cursor = cursorForHydratedEvents(remote.events);
        authStore.setLastSyncedEventCursor(cursor.id, cursor.timestamp);
        authStore.setSyncStatus('synced');
        authStore.setLastSyncedAt(Date.now());
      },
      () => {
        // Declining leaves local data untouched but signs back out rather
        // than staying in a half-linked state.
        void authStore.signOut();
      }
    );
  } catch {
    authStore.setSyncStatus('error');
  }
}

// --- Ongoing push sync engine ------------------------------------------------

let unsubGame: (() => void) | null = null;
let unsubAuth: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function runSyncTick(userId: string): Promise<void> {
  const authStore = useAuthStore.getState();
  authStore.setSyncStatus('syncing');
  const ok = await pushSnapshot(userId);
  await pushNewEvents(userId);
  authStore.setSyncStatus(ok ? 'synced' : 'error');
  if (ok) authStore.setLastSyncedAt(Date.now());
}

function scheduleDebouncedTick() {
  const { session } = useAuthStore.getState();
  if (!session) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void runSyncTick(session.user.id), DEBOUNCE_MS);
}

/**
 * Call when the app returns to the foreground. Catches up on any push that
 * was skipped while backgrounded or offline — a no-op if signed out.
 */
export function syncOnForeground(): void {
  const { session } = useAuthStore.getState();
  if (session) void runSyncTick(session.user.id);
}

/**
 * Mounts the background sync engine. Call once at app root; returns an
 * unsubscribe. Pushes local changes to Supabase whenever signed in — never
 * blocks or awaits from the UI's perspective.
 */
export function startSyncEngine(): () => void {
  if (!isSupabaseConfigured) return () => {};

  unsubGame = useGameStore.subscribe((state, prev) => {
    const relevantChanged =
      state.profile !== prev.profile ||
      state.attributes !== prev.attributes ||
      state.attributeDefs !== prev.attributeDefs ||
      state.attributeOrder !== prev.attributeOrder ||
      state.quests !== prev.quests ||
      state.streak !== prev.streak ||
      state.settings !== prev.settings ||
      state.wallet !== prev.wallet ||
      state.habits !== prev.habits ||
      state.dailies !== prev.dailies ||
      state.rewards !== prev.rewards ||
      state.inventory !== prev.inventory ||
      state.challenge !== prev.challenge ||
      state.unlockedPerks !== prev.unlockedPerks ||
      state.spentAP !== prev.spentAP ||
      state.events !== prev.events;
    if (relevantChanged) scheduleDebouncedTick();
  });

  unsubAuth = useAuthStore.subscribe((state, prev) => {
    // A session appearing (fresh sign-in OR restored at boot) resumes
    // push-syncing immediately, no debounce. reconcileAfterAuth handles the
    // one-time guest-linking decision separately, right after signIn/signUp.
    if (state.session && state.session !== prev.session) {
      void runSyncTick(state.session.user.id);
    }
  });

  return () => {
    unsubGame?.();
    unsubAuth?.();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}
