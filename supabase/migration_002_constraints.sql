-- ============================================================
-- Game Life — Supabase schema follow-up (v1.1: domain constraints)
--
-- Run this once in the Supabase Dashboard: SQL Editor -> New query
-- -> paste this whole file -> Run. Safe to run on an existing
-- database with real data — every enum value already written by
-- the app matches these constraints, so nothing existing is
-- rejected; this only stops future writes of garbage/oversized
-- values (from a modified client, a bug, or direct API misuse).
--
-- attribute_key columns are intentionally left unconstrained:
-- custom life areas use arbitrary user-chosen slugs, not a fixed
-- enum, so there's no fixed domain to check them against.
-- ============================================================

alter table public.profiles
  add constraint profiles_name_length check (char_length(name) <= 100);

alter table public.attribute_defs
  add constraint attribute_defs_name_length check (char_length(name) <= 60),
  add constraint attribute_defs_description_length check (char_length(description) <= 500);

alter table public.progression_events
  add constraint progression_events_type_check check (
    type in ('xp_grant','ap_grant','decay','quest_complete','quest_partial','habit_slip','daily_miss','reward_redeem','loot_drop','challenge_clear')
  ),
  add constraint progression_events_note_length check (char_length(note) <= 500);

alter table public.quests
  add constraint quests_type_check check (type in ('daily','weekly','main','comeback','custom')),
  add constraint quests_difficulty_check check (difficulty in ('trivial','easy','medium','hard','epic')),
  add constraint quests_state_check check (state in ('available','active','completed','failed','abandoned')),
  add constraint quests_title_length check (char_length(title) <= 200),
  add constraint quests_description_length check (char_length(description) <= 1000),
  add constraint quests_rationale_length check (char_length(rationale) <= 1000);

alter table public.habits
  add constraint habits_polarity_check check (polarity in ('good','bad')),
  add constraint habits_difficulty_check check (difficulty in ('trivial','easy','medium','hard','epic')),
  add constraint habits_title_length check (char_length(title) <= 200);

alter table public.dailies
  add constraint dailies_difficulty_check check (difficulty in ('trivial','easy','medium','hard','epic')),
  add constraint dailies_title_length check (char_length(title) <= 200);

alter table public.rewards
  add constraint rewards_title_length check (char_length(title) <= 200);

alter table public.inventory
  add constraint inventory_kind_check check (kind in ('gem_cache','streak_freeze','xp_booster','artifact')),
  add constraint inventory_rarity_check check (rarity in ('common','rare','epic','legendary')),
  add constraint inventory_name_length check (char_length(name) <= 200),
  add constraint inventory_description_length check (char_length(description) <= 500);

alter table public.weekly_challenges
  add constraint weekly_challenges_state_check check (state in ('active','cleared','failed')),
  add constraint weekly_challenges_title_length check (char_length(title) <= 200);
