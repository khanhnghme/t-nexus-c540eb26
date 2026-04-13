import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildPaymentConfirmationEmail, buildInvoiceHtml } from "../_shared/email-html-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, userId } = await req.json();
    if (!orderId || !userId) {
      return new Response(JSON.stringify({ success: false, error: "Missing orderId or userId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order with idempotency check
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("[payment-email] Order not found:", orderId);
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: skip if already sent
    if (order.payment_email_sent) {
      console.log("[payment-email] Already sent for order:", orderId);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, student_id, institution, phone, plan_started_at, plan_expires_at")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.error("[payment-email] Profile/email not found for user:", userId);
      return new Response(JSON.stringify({ success: false, error: "No email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build plan label
    const planLabels: Record<string, string> = {
      plan_free: "Free",
      plan_plus: "Plus",
      plan_pro: "Pro",
      plan_business: "Business",
      plan_custom: "Custom",
    };
    const planName = planLabels[order.plan] || order.plan || "Add-on";
    const isAddon = order.order_type === "addon";

    // Build email body
    const emailHtml = buildPaymentConfirmationEmail({
      recipientName: profile.full_name || "Khách hàng",
      planName: isAddon ? "Add-on" : `${planName} Plan`,
      amount: order.total_amount,
      orderCode: order.order_code || order.id.slice(0, 8),
      paidAt: order.completed_at || order.created_at,
      billingCycle: order.billing_cycle,
    });

    // Build invoice HTML attachment
    const invoiceHtml = buildInvoiceHtml({
      order,
      profile,
      planName,
      isAddon,
    });

    // Send via Resend with attachment
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "T-Nexus <noreply@t-nexus.io.vn>";

    if (!RESEND_API_KEY) {
      console.error("[payment-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceFilename = `Invoice-${order.order_code || orderId.slice(0, 8)}.html`;

    // Use TextEncoder to properly handle UTF-8 → base64
    const encoder = new TextEncoder();
    const invoiceBytes = encoder.encode(invoiceHtml);
    // Convert Uint8Array to base64
    let binary = "";
    for (let i = 0; i < invoiceBytes.length; i++) {
      binary += String.fromCharCode(invoiceBytes[i]);
    }
    const invoiceBase64 = btoa(binary);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [profile.email],
        subject: `Xác nhận thanh toán — T-Nexus (${order.order_code || ""})`,
        html: emailHtml,
        attachments: [
          {
            filename: invoiceFilename,
            content: invoiceBase64,
          },
        ],
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[payment-email] Resend error:", resendData);
      // Log to email_send_log
      await supabase.from("email_send_log").insert({
        recipient_email: profile.email,
        template_name: "payment_confirmation",
        status: "failed",
        error_message: JSON.stringify(resendData),
        metadata: { order_id: orderId, order_code: order.order_code },
      });
      return new Response(JSON.stringify({ success: false, error: "Email send failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as sent (idempotency flag)
    await supabase.from("orders").update({ payment_email_sent: true }).eq("id", orderId);

    // Log success
    await supabase.from("email_send_log").insert({
      recipient_email: profile.email,
      template_name: "payment_confirmation",
      status: "sent",
      message_id: resendData.id || null,
      metadata: { order_id: orderId, order_code: order.order_code },
    });

    console.log("[payment-email] Sent successfully to", profile.email, "for order", orderId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[payment-email] Unexpected error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
