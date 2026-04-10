import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: string } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) return null;
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

async function getValidToken(supabase: any, userId: string): Promise<{ accessToken: string; calendarId: string } | null> {
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!tokenRow) return null;

  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  if (expiresAt > new Date(now.getTime() + 60000)) {
    return { accessToken: tokenRow.access_token, calendarId: tokenRow.calendar_id };
  }

  // Refresh
  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  if (!refreshed) return null;

  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: refreshed.access_token, expires_at: refreshed.expires_at })
    .eq("user_id", userId);

  return { accessToken: refreshed.access_token, calendarId: tokenRow.calendar_id };
}

async function gcalRequest(accessToken: string, path: string, method = "GET", body?: any) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar API error: ${res.status} ${err}`);
  }
  return method === "DELETE" ? null : res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: claimsError } = await supabaseUser.auth.getUser(token);
    if (claimsError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = authUser.id as string;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const validToken = await getValidToken(supabase, userId);
    if (!validToken) {
      return new Response(JSON.stringify({ error: "not_connected" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { accessToken, calendarId } = validToken;
    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action || "sync";

    if (action === "status") {
      return new Response(JSON.stringify({ connected: true, calendarId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
      await supabase.from("calendar_sync_map").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PUSH: local events -> Google Calendar ===
    const pushResults = { created: 0, updated: 0, errors: 0 };

    // Get personal events
    const { data: personalEvents } = await supabase
      .from("personal_events")
      .select("*")
      .eq("user_id", userId);

    // Get tasks with deadlines assigned to user
    const { data: assignments } = await supabase
      .from("task_assignments")
      .select("task_id")
      .eq("user_id", userId);

    const assignedTaskIds = assignments?.map((a: any) => a.task_id) || [];

    let tasks: any[] = [];
    if (assignedTaskIds.length > 0) {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, deadline, status, group_id, groups!inner(name)")
        .in("id", assignedTaskIds)
        .not("deadline", "is", null);
      tasks = data || [];
    }

    // Get existing sync map
    const { data: syncMap } = await supabase
      .from("calendar_sync_map")
      .select("*")
      .eq("user_id", userId);

    const syncMapByLocal = new Map((syncMap || []).map((s: any) => [`${s.local_event_type}:${s.local_event_id}`, s]));

    // Push personal events
    for (const ev of (personalEvents || [])) {
      const key = `personal:${ev.id}`;
      const existing = syncMapByLocal.get(key);
      const gcalEvent = {
        summary: ev.title,
        description: ev.description || "",
        start: { dateTime: ev.start_time, timeZone: "Asia/Ho_Chi_Minh" },
        end: { dateTime: ev.end_time || ev.start_time, timeZone: "Asia/Ho_Chi_Minh" },
      };

      try {
        if (existing) {
          await gcalRequest(accessToken, `/calendars/${calendarId}/events/${existing.google_event_id}`, "PATCH", gcalEvent);
          await supabase.from("calendar_sync_map").update({ last_synced_at: new Date().toISOString() }).eq("id", existing.id);
          pushResults.updated++;
        } else {
          const created = await gcalRequest(accessToken, `/calendars/${calendarId}/events`, "POST", gcalEvent);
          await supabase.from("calendar_sync_map").insert({
            user_id: userId,
            local_event_id: ev.id,
            local_event_type: "personal",
            google_event_id: created.id,
            google_calendar_id: calendarId,
          });
          pushResults.created++;
        }
      } catch (e) {
        console.error(`Push personal event error:`, e);
        pushResults.errors++;
      }
    }

    // Push tasks
    for (const task of tasks) {
      const key = `task:${task.id}`;
      const existing = syncMapByLocal.get(key);
      const deadline = task.deadline;
      const gcalEvent = {
        summary: `[${task.groups?.name}] ${task.title}`,
        description: `Task deadline - Status: ${task.status}`,
        start: { dateTime: deadline, timeZone: "Asia/Ho_Chi_Minh" },
        end: { dateTime: deadline, timeZone: "Asia/Ho_Chi_Minh" },
      };

      try {
        if (existing) {
          await gcalRequest(accessToken, `/calendars/${calendarId}/events/${existing.google_event_id}`, "PATCH", gcalEvent);
          await supabase.from("calendar_sync_map").update({ last_synced_at: new Date().toISOString() }).eq("id", existing.id);
          pushResults.updated++;
        } else {
          const created = await gcalRequest(accessToken, `/calendars/${calendarId}/events`, "POST", gcalEvent);
          await supabase.from("calendar_sync_map").insert({
            user_id: userId,
            local_event_id: task.id,
            local_event_type: "task",
            google_event_id: created.id,
            google_calendar_id: calendarId,
          });
          pushResults.created++;
        }
      } catch (e) {
        console.error(`Push task error:`, e);
        pushResults.errors++;
      }
    }

    // === PULL: Google Calendar -> local personal events ===
    const pullResults = { created: 0, skipped: 0, errors: 0 };

    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

      const gcalEvents = await gcalRequest(
        accessToken,
        `/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=250`
      );

      const existingGoogleIds = new Set((syncMap || []).map((s: any) => s.google_event_id));

      for (const gev of (gcalEvents.items || [])) {
        if (existingGoogleIds.has(gev.id)) {
          pullResults.skipped++;
          continue;
        }

        const startTime = gev.start?.dateTime || (gev.start?.date ? `${gev.start.date}T00:00:00` : null);
        const endTime = gev.end?.dateTime || gev.end?.date || null;

        if (!startTime) {
          pullResults.skipped++;
          continue;
        }

        try {
          const { data: newEvent } = await supabase
            .from("personal_events")
            .insert({
              user_id: userId,
              title: gev.summary || "Google Calendar Event",
              description: gev.description || null,
              start_time: startTime,
              end_time: endTime,
              color: "#4285f4",
            })
            .select("id")
            .single();

          if (newEvent) {
            await supabase.from("calendar_sync_map").insert({
              user_id: userId,
              local_event_id: newEvent.id,
              local_event_type: "personal",
              google_event_id: gev.id,
              google_calendar_id: calendarId,
            });
            pullResults.created++;
          }
        } catch (e) {
          console.error("Pull event error:", e);
          pullResults.errors++;
        }
      }
    } catch (e) {
      console.error("Pull phase error:", e);
    }

    return new Response(JSON.stringify({ success: true, push: pushResults, pull: pullResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
