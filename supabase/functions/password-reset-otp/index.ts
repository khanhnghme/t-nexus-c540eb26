import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildBrandedOtpEmail } from "../_shared/email-html-builder.ts";
import { getEmailTexts, type EmailLocale } from "../_shared/email-i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_URL = "https://api.resend.com";
const FROM_EMAIL = "T-Nexus <noreply@t-nexus.io.vn>";

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildResetOtpHtml(otpCode: string, locale: EmailLocale = 'vi'): string {
  const t = getEmailTexts(locale);
  return buildBrandedOtpEmail({
    title: t.otpResetTitle,
    subtitle: t.otpResetSubtitle,
    otpCode,
    expiryText: t.otpResetExpiry,
    warningText: t.otpResetWarning,
    ignoreText: t.otpResetIgnore,
    locale,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, email, code, new_password } = body;

    // Resolve locale from profile
    async function getLocaleByEmail(emailAddr: string): Promise<EmailLocale> {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_locale")
          .eq("email", emailAddr.toLowerCase())
          .maybeSingle();
        return data?.preferred_locale === 'en' ? 'en' : 'vi';
      } catch { return 'vi'; }
    }

    // ===== SEND OTP CODE =====
    if (action === "send_code") {
      if (!email) {
        return jsonResponse({ error: "Email is required" }, 400);
      }

      const locale = await getLocaleByEmail(email);
      const t = getEmailTexts(locale);

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase
        .from("password_reset_codes")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("used", false);

      await supabase.from("password_reset_codes").insert({
        email: email.toLowerCase(),
        code: otpCode,
        expires_at: expiresAt,
      });

      const emailRes = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email.toLowerCase()],
          subject: t.otpResetSubject(otpCode),
          html: buildResetOtpHtml(otpCode, locale),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
        return jsonResponse({ error: "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau." }, 500);
      }

      return jsonResponse({ success: true, message: "Mã xác minh đã được gửi đến email của bạn" });
    }

    // ===== VERIFY CODE =====
    if (action === "verify_code") {
      if (!email || !code) {
        return jsonResponse({ error: "Email and code are required" }, 400);
      }

      const { data: codeData } = await supabase
        .from("password_reset_codes")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("code", code)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!codeData) {
        return jsonResponse({ error: "Mã xác minh không đúng hoặc đã hết hạn" }, 400);
      }

      return jsonResponse({ success: true, verified: true });
    }

    // ===== RESET PASSWORD =====
    if (action === "reset_password") {
      if (!email || !code || !new_password) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      if (new_password.length < 6) {
        return jsonResponse({ error: "Mật khẩu tối thiểu 6 ký tự" }, 400);
      }

      const { data: codeData } = await supabase
        .from("password_reset_codes")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("code", code)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!codeData) {
        return jsonResponse({ error: "Mã xác minh không hợp lệ hoặc đã hết hạn" }, 400);
      }

      const { data: usersData } = await supabase.auth.admin.listUsers();
      const targetUser = usersData?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!targetUser) {
        return jsonResponse({ error: "Không tìm thấy tài khoản" }, 404);
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        targetUser.id,
        { password: new_password }
      );

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }

      await supabase
        .from("password_reset_codes")
        .update({ used: true })
        .eq("id", codeData.id);

      await supabase.from("demo_passwords").upsert({
        user_id: targetUser.id,
        plain_password: new_password,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return jsonResponse({ success: true, message: "Mật khẩu đã được đặt lại thành công" });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Edge function error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
