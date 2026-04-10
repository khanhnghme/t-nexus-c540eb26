import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Determine the app origin for redirect
  const appOrigin = SUPABASE_URL.includes("supabase.co")
    ? "https://t-nexus.lovable.app"
    : "http://localhost:5173";

  if (error || !code || !userId) {
    return Response.redirect(`${appOrigin}/calendar?gcal=error`, 302);
  }

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${appOrigin}/calendar?gcal=error`, 302);
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Save tokens using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        calendar_id: "primary",
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return Response.redirect(`${appOrigin}/calendar?gcal=error`, 302);
    }

    return Response.redirect(`${appOrigin}/calendar?gcal=connected`, 302);
  } catch (err) {
    console.error("Callback error:", err);
    return Response.redirect(`${appOrigin}/calendar?gcal=error`, 302);
  }
});
