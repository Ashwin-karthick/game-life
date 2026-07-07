import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Deletes the calling user's auth.users row. Every table (profiles,
// attribute_defs, attribute_states, progression_events, quests, habits,
// dailies, rewards, inventory, weekly_challenges) has `on delete cascade` on
// its user_id foreign key, so this single call also removes every row of the
// caller's data across all 9 tables -- no per-table cleanup needed here.
Deno.serve(async (req: Request) => {
  const jsonHeaders = { "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Resolve the caller's identity from their own JWT -- never trust a
    // user id passed in the request body.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: jsonHeaders });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await admin.auth.admin.deleteUser(callerData.user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
