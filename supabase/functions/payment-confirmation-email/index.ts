import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { buildPaymentConfirmationEmail } from "../_shared/email-html-builder.ts";
import { buildInvoicePdf } from "../_shared/invoice-pdf-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LABELS: Record<string, string> = {
  plan_free: "Free",
  plan_plus: "Plus",
  plan_pro: "Pro",
  plan_business: "Business",
  plan_custom: "Custom",
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

    // Fetch order
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

    const planName = PLAN_LABELS[order.plan] || order.plan || "Add-on";
    const isAddon = order.order_type === "addon";

    // 1. Build email body HTML
    const emailHtml = buildPaymentConfirmationEmail({
      recipientName: profile.full_name || "Khách hàng",
      planName: isAddon ? "Add-on" : `${planName} Plan`,
      amount: order.total_amount,
      orderCode: order.order_code || order.id.slice(0, 8),
      paidAt: order.completed_at || order.created_at,
      billingCycle: order.billing_cycle,
    });

    // 2. Generate PDF invoice
    const pdfBytes = buildInvoicePdf({ order, profile });

    // 3. Save PDF to Storage bucket "invoices"
    const storagePath = `${userId}/${order.order_code || order.id}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("invoices")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.warn("[payment-email] Storage upload failed (non-blocking):", uploadErr.message);
    } else {
      console.log("[payment-email] PDF saved to storage:", storagePath);
    }

    // 4. Send email via Resend with PDF attachment
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "T-Nexus <noreply@t-nexus.io.vn>";

    if (!RESEND_API_KEY) {
      console.error("[payment-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfFilename = `Invoice-${order.order_code || orderId.slice(0, 8)}.pdf`;

    // Convert Uint8Array to base64
    let binary = "";
    for (let i = 0; i < pdfBytes.length; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    const pdfBase64 = btoa(binary);

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
            filename: pdfFilename,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[payment-email] Resend error:", resendData);
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

    // 5. Mark as sent (idempotency)
    await supabase.from("orders").update({ payment_email_sent: true }).eq("id", orderId);

    // 6. Log success
    await supabase.from("email_send_log").insert({
      recipient_email: profile.email,
      template_name: "payment_confirmation",
      status: "sent",
      message_id: resendData.id || null,
      metadata: { order_id: orderId, order_code: order.order_code },
    });

    console.log("[payment-email] Sent PDF invoice to", profile.email, "for order", orderId);

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
