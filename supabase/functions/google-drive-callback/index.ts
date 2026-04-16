import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appOrigin = SUPABASE_URL.includes("supabase.co")
    ? "https://t-nexus.io.vn"
    : "http://localhost:5173";

  // Decode state to extract userId and returnUrl
  let userId: string | null = null;
  let returnUrl = "/settings";
  if (stateParam) {
    try {
      const decoded = atob(stateParam);
      const separatorIndex = decoded.indexOf("::");
      if (separatorIndex !== -1) {
        userId = decoded.substring(0, separatorIndex);
        returnUrl = decoded.substring(separatorIndex + 2) || "/settings";
      } else {
        // Legacy format: state is just userId
        userId = decoded;
      }
    } catch {
      // If base64 decode fails, treat as plain userId (legacy)
      userId = stateParam;
    }
  }

  const buildRedirect = (status: string) => {
    const sep = returnUrl.includes("?") ? "&" : "?";
    return `${appOrigin}${returnUrl}${sep}gdrive=${status}`;
  };

  if (error || !code || !userId) {
    return Response.redirect(buildRedirect("error"), 302);
  }

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-drive-callback`;

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
      return Response.redirect(buildRedirect("error"), 302);
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    let emailAddress: string | null = null;
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        emailAddress = userInfo.email || null;
      }
    } catch {
      // ignore
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from("google_drive_tokens")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        email_address: emailAddress,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return Response.redirect(buildRedirect("error"), 302);
    }

    return Response.redirect(buildRedirect("connected"), 302);
  } catch (err) {
    console.error("Callback error:", err);
    return Response.redirect(buildRedirect("error"), 302);
  }
});
