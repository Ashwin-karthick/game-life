-- ============================================================
-- Game Life — Supabase schema follow-up (v1.2: lock down default fixture)
--
-- Every Supabase project ships a `public.rls_auto_enable()` event
-- trigger function (auto-enables RLS on newly created tables — a
-- safety net, not something this project's migrations created).
-- By default it grants EXECUTE to `anon` and `authenticated`,
-- which the Supabase security linter flags: the function is
-- exposed as a callable RPC endpoint (POST /rest/v1/rpc/
-- rls_auto_enable) to anyone, signed in or not.
--
-- It can't actually be invoked usefully that way — Postgres only
-- allows an `event_trigger`-returning function to run from the
-- event-trigger system itself — but there's no reason to leave
-- unnecessary EXECUTE grants in place. This does not affect the
-- auto-RLS-enable behavior; the event trigger still fires as
-- normal regardless of these role grants.
-- ============================================================

revoke execute on function public.rls_auto_enable() from anon, authenticated;
