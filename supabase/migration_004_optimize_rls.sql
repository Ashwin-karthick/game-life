-- ============================================================
-- Game Life — Supabase schema follow-up (v1.3: RLS performance)
--
-- Every policy called auth.uid() unwrapped, which Postgres
-- re-evaluates once per row instead of once per query (the
-- "Auth RLS Initialization Plan" lint). Wrapping it in a scalar
-- subquery lets the planner cache it as an initplan instead.
-- This is a pure performance change — the security semantics are
-- byte-for-byte identical, just faster at scale.
-- ============================================================

alter policy profiles_select_own on public.profiles using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy profiles_delete_own on public.profiles using ((select auth.uid()) = id);

alter policy attribute_defs_all_own on public.attribute_defs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy attribute_states_all_own on public.attribute_states using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy progression_events_select_own on public.progression_events using ((select auth.uid()) = user_id);
alter policy progression_events_insert_own on public.progression_events with check ((select auth.uid()) = user_id);

alter policy quests_all_own on public.quests using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy habits_all_own on public.habits using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy dailies_all_own on public.dailies using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy rewards_all_own on public.rewards using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy inventory_all_own on public.inventory using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy weekly_challenges_all_own on public.weekly_challenges using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
