-- Adds the two new event types the undo system writes (habit_slip_undo,
-- daily_uncomplete) to progression_events' type CHECK constraint.
alter table progression_events drop constraint progression_events_type_check;
alter table progression_events add constraint progression_events_type_check
  check (type = any (array['xp_grant','ap_grant','decay','quest_complete','quest_partial','habit_slip','daily_miss','reward_redeem','loot_drop','challenge_clear','habit_slip_undo','daily_uncomplete']));
