import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_GMAIL_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_GMAIL_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
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
  if (!res.ok) return null;
  return res.json();
}

async function getValidToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("google_gmail_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  // Check if token is expired (with 5 min buffer)
  if (new Date(tokenRow.expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    if (!refreshed) return null;

    const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("google_gmail_tokens")
      .update({ access_token: refreshed.access_token, expires_at: newExpires })
      .eq("user_id", userId);

    return refreshed.access_token;
  }

  return tokenRow.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- DISCONNECT ---
    if (action === "disconnect") {
      await supabase.from("google_gmail_tokens").delete().eq("user_id", user.id);
      await supabase.from("gmail_messages").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STATUS ---
    if (action === "status") {
      const { data } = await supabase
        .from("google_gmail_tokens")
        .select("email_address")
        .eq("user_id", user.id)
        .maybeSingle();
      return new Response(JSON.stringify({ connected: !!data, email: data?.email_address }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SYNC ---
    if (action === "sync") {
      const accessToken = await getValidToken(supabase, user.id);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Gmail not connected or token expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch latest 50 messages list
      const listRes = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!listRes.ok) {
        const err = await listRes.text();
        console.error("Gmail list error:", err);
        return new Response(JSON.stringify({ error: "Failed to fetch emails" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const listData = await listRes.json();
      const messageIds: { id: string; threadId: string }[] = listData.messages || [];

      if (messageIds.length === 0) {
        return new Response(JSON.stringify({ synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch details for each message (batch of 50)
      const messages = [];
      for (const msg of messageIds) {
        try {
          const detailRes = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!detailRes.ok) {
            await detailRes.text();
            continue;
          }
          const detail = await detailRes.json();

          const headers = detail.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || null;

          const fromRaw = getHeader("From") || "";
          let fromName = "";
          let fromEmail = fromRaw;
          const match = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
          if (match) {
            fromName = match[1].replace(/^"|"$/g, "").trim();
            fromEmail = match[2];
          }

          const isRead = !detail.labelIds?.includes("UNREAD");

          messages.push({
            user_id: user.id,
            gmail_message_id: detail.id,
            thread_id: detail.threadId,
            subject: getHeader("Subject"),
            snippet: detail.snippet,
            from_email: fromEmail,
            from_name: fromName,
            received_at: new Date(parseInt(detail.internalDate)).toISOString(),
            is_read: isRead,
            labels: detail.labelIds || [],
          });
        } catch (e) {
          console.error("Error fetching message detail:", e);
        }
      }

      if (messages.length > 0) {
        const { error: upsertErr } = await supabase
          .from("gmail_messages")
          .upsert(messages, { onConflict: "user_id,gmail_message_id" });

        if (upsertErr) {
          console.error("Upsert error:", upsertErr);
        }
      }

      return new Response(JSON.stringify({ synced: messages.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Gmail sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
