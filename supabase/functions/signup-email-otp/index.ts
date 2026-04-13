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

function resolveLocale(bodyLocale?: string): EmailLocale {
  return bodyLocale === 'en' ? 'en' : 'vi';
}

function buildSignupOtpHtml(otpCode: string, locale: EmailLocale = 'vi'): string {
  const t = getEmailTexts(locale);
  return buildBrandedOtpEmail({
    title: t.otpSignupTitle,
    subtitle: t.otpSignupSubtitle,
    otpCode,
    expiryText: t.otpSignupExpiry,
    warningText: t.otpSignupWarning,
    ignoreText: t.otpSignupIgnore,
    locale,
  });
}

async function getProfileLocale(supabase: any, userId: string): Promise<EmailLocale> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", userId)
      .maybeSingle();
    return resolveLocale(data?.preferred_locale);
  } catch { return 'vi'; }
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
    const { action, email, user_id, code } = body;
    // locale from frontend (for new users without profile)
    const bodyLocale = resolveLocale(body.locale);

    // ===== REGISTER (create user without session) =====
    if (action === "register") {
      const { student_id, full_name, password, institution } = body;
      if (!email || !full_name || !password) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      const { data: existingEmailProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingEmailProfile) {
        return jsonResponse({ success: false, error: "Email đã được sử dụng." });
      }

      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: false,
        user_metadata: { student_id, full_name, institution: institution || null },
      });

      if (createError) {
        console.error("Create user error:", createError);
        const msg = createError.message?.toLowerCase() || "";
        if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
          let unverifiedUser = null;
          const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 50, page: 1 });
          if (allUsers?.users) {
            unverifiedUser = allUsers.users.find(
              (u: any) => u.email?.toLowerCase() === email.toLowerCase() && !u.email_confirmed_at
            );
          }

          if (unverifiedUser) {
            const locale = await getProfileLocale(supabase, unverifiedUser.id) || bodyLocale;
            const t = getEmailTexts(locale);
            const otpCode = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

            await supabase
              .from("email_verification_codes")
              .update({ used: true })
              .eq("email", email.toLowerCase())
              .eq("used", false);

            await supabase.from("email_verification_codes").insert({
              user_id: unverifiedUser.id,
              email: email.toLowerCase(),
              code: otpCode,
              expires_at: expiresAt,
            });

            await fetch(`${RESEND_API_URL}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [email.toLowerCase()],
                subject: t.otpSignupSubject(otpCode),
                html: buildSignupOtpHtml(otpCode, locale),
              }),
            });

            return jsonResponse({
              success: true,
              resume: true,
              user_id: unverifiedUser.id,
              message: "Tài khoản chưa xác minh. Đã gửi lại mã OTP.",
            });
          }

          return jsonResponse({ success: false, error: "Email đã được sử dụng." });
        }
        return jsonResponse({ success: false, error: "Không thể tạo tài khoản. Vui lòng thử lại." });
      }

      const newUserId = userData.user.id;
      const locale = bodyLocale;
      const t = getEmailTexts(locale);

      supabase
        .from("demo_passwords")
        .upsert({ user_id: newUserId, plain_password: password }, { onConflict: "user_id" })
        .then(() => {});

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("email_verification_codes").insert({
        user_id: newUserId,
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
          subject: t.otpSignupSubject(otpCode),
          html: buildSignupOtpHtml(otpCode, locale),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
      }

      return jsonResponse({
        success: true,
        user_id: newUserId,
        message: "Tài khoản đã được tạo. Mã xác minh đã gửi đến email.",
      });
    }

    // ===== SEND CODE =====
    if (action === "send_code") {
      if (!email || !user_id) {
        return jsonResponse({ error: "Email and user_id are required" }, 400);
      }

      const locale = await getProfileLocale(supabase, user_id) || bodyLocale;
      const t = getEmailTexts(locale);

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("used", false);

      await supabase.from("email_verification_codes").insert({
        user_id,
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
          subject: t.otpSignupSubject(otpCode),
          html: buildSignupOtpHtml(otpCode, locale),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
        return jsonResponse({ error: "Không thể gửi email xác minh. Vui lòng thử lại sau." }, 500);
      }

      return jsonResponse({ success: true, message: "Mã xác minh đã được gửi đến email của bạn" });
    }

    // ===== VERIFY CODE =====
    if (action === "verify_code") {
      if (!email || !code || !user_id) {
        return jsonResponse({ error: "Email, code and user_id are required" }, 400);
      }

      const { data: codeData } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!codeData) {
        return jsonResponse({ error: "Mã xác minh đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã mới." }, 400);
      }

      if (codeData.attempts >= 5) {
        await supabase
          .from("email_verification_codes")
          .update({ used: true })
          .eq("id", codeData.id);
        return jsonResponse({ error: "Đã nhập sai quá 5 lần. Vui lòng gửi lại mã mới.", max_attempts: true }, 400);
      }

      if (codeData.code !== code) {
        await supabase
          .from("email_verification_codes")
          .update({ attempts: codeData.attempts + 1 })
          .eq("id", codeData.id);
        const remaining = 4 - codeData.attempts;
        return jsonResponse({
          error: `Mã xác minh không đúng. Còn ${remaining} lần thử.`,
          remaining_attempts: remaining,
        }, 400);
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user_id,
        { email_confirm: true }
      );

      if (updateError) {
        console.error("Failed to confirm user:", updateError);
        return jsonResponse({ error: "Không thể xác minh tài khoản" }, 500);
      }

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("id", codeData.id);

      return jsonResponse({ success: true, verified: true });
    }

    // ===== RESEND CODE =====
    if (action === "resend_code") {
      if (!email || !user_id) {
        return jsonResponse({ error: "Email and user_id are required" }, 400);
      }

      const { data: lastCode } = await supabase
        .from("email_verification_codes")
        .select("created_at")
        .eq("email", email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastCode) {
        const elapsed = Date.now() - new Date(lastCode.created_at).getTime();
        if (elapsed < 60000) {
          const wait = Math.ceil((60000 - elapsed) / 1000);
          return jsonResponse({
            error: `Vui lòng chờ ${wait} giây trước khi gửi lại mã.`,
            wait_seconds: wait,
          }, 429);
        }
      }

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("used", false);

      const locale = await getProfileLocale(supabase, user_id) || bodyLocale;
      const t = getEmailTexts(locale);

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("email_verification_codes").insert({
        user_id,
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
          subject: t.otpSignupSubject(otpCode),
          html: buildSignupOtpHtml(otpCode, locale),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend resend_code error:", errText);
        return jsonResponse({ error: "Không thể gửi lại email xác minh." }, 500);
      }

      return jsonResponse({ success: true, message: "Mã xác minh mới đã được gửi" });
    }

    // ===== RESUME VERIFICATION (for login with unverified email) =====
    if (action === "resume_verification") {
      if (!email) {
        return jsonResponse({ error: "Email is required" }, 400);
      }

      const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 50, page: 1 });
      const unverifiedUser = allUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase() && !u.email_confirmed_at
      );

      if (!unverifiedUser) {
        return jsonResponse({ success: false, error: "Không tìm thấy tài khoản chưa xác minh." });
      }

      const { data: lastCode } = await supabase
        .from("email_verification_codes")
        .select("created_at")
        .eq("email", email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastCode) {
        const elapsed = Date.now() - new Date(lastCode.created_at).getTime();
        if (elapsed < 60000) {
          const wait = Math.ceil((60000 - elapsed) / 1000);
          return jsonResponse({
            error: `Vui lòng chờ ${wait} giây trước khi gửi lại mã.`,
            wait_seconds: wait,
          }, 429);
        }
      }

      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("email", email.toLowerCase())
        .eq("used", false);

      const locale = await getProfileLocale(supabase, unverifiedUser.id) || bodyLocale;
      const t = getEmailTexts(locale);

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("email_verification_codes").insert({
        user_id: unverifiedUser.id,
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
          subject: t.otpSignupSubject(otpCode),
          html: buildSignupOtpHtml(otpCode, locale),
        }),
      });

      if (!emailRes.ok) {
        console.error("Resend resume_verification error:", await emailRes.text());
        return jsonResponse({ error: "Không thể gửi email xác minh." }, 500);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, student_id")
        .eq("id", unverifiedUser.id)
        .maybeSingle();

      return jsonResponse({
        success: true,
        user_id: unverifiedUser.id,
        email: email.toLowerCase(),
        full_name: profileData?.full_name || unverifiedUser.user_metadata?.full_name || "",
        student_id: profileData?.student_id || unverifiedUser.user_metadata?.student_id || "",
      });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("signup-email-otp error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
