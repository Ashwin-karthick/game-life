-- ============================================================
-- Game Life — Supabase schema (v1: single-user backup + sync)
--
-- Run this once in the Supabase Dashboard: SQL Editor -> New query
-- -> paste this whole file -> Run.
--
-- Every table is scoped to the signed-in user via Row Level
-- Security (RLS): a user can only ever see/write their own rows.
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at bigint not null,
  focus_domains text[] not null default '{}',
  attribute_order text[] not null default '{}',
  unlocked_perks text[] not null default '{}',
  streak_current_len integer not null default 0,
  streak_longest_len integer not null default 0,
  streak_last_active_date text,
  streak_freeze_tokens integer not null default 0,
  reminder_enabled boolean not null default false,
  reminder_hour integer not null default 20,
  reminder_minute integer not null default 0,
  wallet_gems integer not null default 0,
  wallet_xp_boost_until bigint,
  spent_ap integer not null default 0,
  last_daily_sweep_date text,
  seen_intro_version integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create table public.attribute_defs (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  color text not null,
  icon text not null,
  base_xp numeric not null,
  growth_exp numeric not null,
  decay_pct_daily numeric not null,
  custom boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.attribute_defs enable row level security;
create policy "attribute_defs_all_own" on public.attribute_defs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.attribute_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  attribute_key text not null,
  level integer not null default 1,
  xp_buffer numeric not null default 0,
  total_ap integer not null default 0,
  last_decay_at bigint not null,
  last_action_at bigint,
  updated_at timestamptz not null default now(),
  primary key (user_id, attribute_key)
);
alter table public.attribute_states enable row level security;
create policy "attribute_states_all_own" on public.attribute_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.progression_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  attribute_key text,
  amount numeric not null,
  note text not null default '',
  quest_id text,
  created_at bigint not null
);
create index progression_events_user_created_idx on public.progression_events (user_id, created_at);
alter table public.progression_events enable row level security;
create policy "progression_events_select_own" on public.progression_events for select using (auth.uid() = user_id);
create policy "progression_events_insert_own" on public.progression_events for insert with check (auth.uid() = user_id);
-- No update/delete policy: events are append-only, matching the client's append-only `events` array.

create table public.quests (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  type text not null,
  title text not null,
  description text not null default '',
  attribute_key text not null,
  difficulty text not null,
  effort_minutes integer not null,
  requirement_count integer not null,
  progress_count integer not null default 0,
  rationale text not null default '',
  state text not null,
  offered_at bigint not null,
  accepted_at bigint,
  due_at bigint,
  completed_at bigint,
  updated_at timestamptz not null default now()
);
create index quests_user_idx on public.quests (user_id);
alter table public.quests enable row level security;
create policy "quests_all_own" on public.quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  polarity text not null,
  attribute_key text not null,
  difficulty text not null,
  created_at bigint not null,
  archived boolean not null default false,
  log_dates text[] not null default '{}',
  total_logs integer not null default 0,
  updated_at timestamptz not null default now()
);
create index habits_user_idx on public.habits (user_id);
alter table public.habits enable row level security;
create policy "habits_all_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.dailies (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  attribute_key text not null,
  difficulty text not null,
  created_at bigint not null,
  archived boolean not null default false,
  completed_dates text[] not null default '{}',
  weekdays smallint[] not null default '{0,1,2,3,4,5,6}',
  updated_at timestamptz not null default now()
);
create index dailies_user_idx on public.dailies (user_id);
alter table public.dailies enable row level security;
create policy "dailies_all_own" on public.dailies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.rewards (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cost integer not null,
  created_at bigint not null,
  updated_at timestamptz not null default now()
);
create index rewards_user_idx on public.rewards (user_id);
alter table public.rewards enable row level security;
create policy "rewards_all_own" on public.rewards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.inventory (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  rarity text not null,
  name text not null,
  description text not null default '',
  obtained_at bigint not null,
  consumed_at bigint,
  gem_value integer,
  updated_at timestamptz not null default now()
);
create index inventory_user_idx on public.inventory (user_id);
alter table public.inventory enable row level security;
create policy "inventory_all_own" on public.inventory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.weekly_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  title text not null,
  description text not null default '',
  target_xp numeric not null,
  progress_xp numeric not null default 0,
  state text not null,
  gem_reward integer not null,
  cleared_at bigint,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_key)
);
alter table public.weekly_challenges enable row level security;
create policy "weekly_challenges_all_own" on public.weekly_challenges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
