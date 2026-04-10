import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

/* ═══ PayPal Webhook Signature Verification ═══ */
async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.warn("[paypal-webhook] PAYPAL_WEBHOOK_ID not set, skipping verification");
    return false;
  }

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("[paypal-webhook] Missing PayPal signature headers");
    return false;
  }

  // Get access token
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("[paypal-webhook] Failed to get access token for verification");
    return false;
  }

  // Verify signature via PayPal API
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  const verifyData = await verifyRes.json();
  const isValid = verifyData.verification_status === "SUCCESS";
  if (!isValid) {
    console.error("[paypal-webhook] Signature verification failed:", verifyData);
  }
  return isValid;
}

/* ═══ Idempotent Addon Update ═══ */
async function applyAddonsIfNeeded(
  supabase: any,
  orderId: string,
  userId: string,
  addons: Array<{ type: string; quantity: number }> | null
) {
  if (!addons || addons.length === 0) return;

  // Atomically check and set flag
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ addons_applied: true })
    .eq("id", orderId)
    .eq("addons_applied", false)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    console.log(`[paypal-webhook] Addons already applied for order ${orderId}, skipping`);
    return;
  }

  for (const addon of addons) {
    const { data: existing } = await supabase
      .from("user_addons")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("addon_type", addon.type)
      .maybeSingle();

    if (existing) {
      await supabase.from("user_addons").update({
        quantity: existing.quantity + addon.quantity,
      }).eq("id", existing.id);
    } else {
      await supabase.from("user_addons").insert({
        user_id: userId,
        addon_type: addon.type,
        quantity: addon.quantity,
      });
    }
  }
}

/* ═══ Idempotent Coupon Update ═══ */
async function applyCouponIfNeeded(supabase: any, orderId: string, couponCode: string | null) {
  if (!couponCode) return;

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ coupon_applied: true })
    .eq("id", orderId)
    .eq("coupon_applied", false)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    console.log(`[paypal-webhook] Coupon already applied for order ${orderId}, skipping`);
    return;
  }

  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, used_count")
    .eq("code", couponCode)
    .maybeSingle();

  if (coupon) {
    await supabase
      .from("coupons")
      .update({ used_count: coupon.used_count + 1 })
      .eq("id", coupon.id);
  }
}

/* ═══ Main Handler ═══ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, bodyText);
    if (!isValid) {
      console.error("[paypal-webhook] Invalid webhook signature, rejecting");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`[paypal-webhook] event_type=${eventType}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /* ═══ CHECKOUT.ORDER.APPROVED — Server-side auto-capture fallback ═══ */
    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const paypalOrderId = resource?.id;
      if (!paypalOrderId) {
        console.log("[paypal-webhook] CHECKOUT.ORDER.APPROVED: No order ID in payload");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("paypal_order_id", paypalOrderId)
        .maybeSingle();

      if (!order) {
        console.log(`[paypal-webhook] CHECKOUT.ORDER.APPROVED: No order found for ${paypalOrderId}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status !== "pending") {
        console.log(`[paypal-webhook] CHECKOUT.ORDER.APPROVED: Order ${order.id} status=${order.status}, skipping capture`);
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Server-side capture
      console.log(`[paypal-webhook] CHECKOUT.ORDER.APPROVED: Auto-capturing order ${paypalOrderId}`);
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
      const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
      const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error("[paypal-webhook] Failed to get access token for auto-capture");
        return new Response(JSON.stringify({ error: "Token failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const captureData = await captureRes.json();

      if (captureData.status !== "COMPLETED") {
        console.error(`[paypal-webhook] Auto-capture failed for ${paypalOrderId}:`, captureData);
        return new Response(JSON.stringify({ received: true, capture_failed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[paypal-webhook] Auto-capture succeeded for ${paypalOrderId}, PAYMENT.CAPTURE.COMPLETED webhook will handle completion`);
      // The capture will trigger a PAYMENT.CAPTURE.COMPLETED webhook from PayPal
      // which will handle the actual order completion logic below
      return new Response(JSON.stringify({ received: true, auto_captured: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const paypalOrderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;
      if (!paypalOrderId) {
        console.log("[paypal-webhook] No order ID found in payload");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("paypal_order_id", paypalOrderId)
        .maybeSingle();

      if (!order) {
        console.log(`[paypal-webhook] No order found for PayPal order ${paypalOrderId}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status === "completed") {
        console.log(`[paypal-webhook] Order ${order.id} already completed, skipping`);
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reject expired orders
      const isExpired = order.status === "expired" || (order.expires_at && new Date(order.expires_at) < new Date());
      if (isExpired) {
        if (order.status !== "expired") {
          await supabase.from("orders").update({ status: "expired" }).eq("id", order.id);
        }
        console.log(`[paypal-webhook] Order ${order.id} expired, rejecting`);
        return new Response(JSON.stringify({ received: true, expired: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const capturedAmount = parseFloat(resource?.amount?.value || order.total_amount);
      const now = new Date();
      const nowISO = now.toISOString();
      const isAddonOrder = order.order_type === "addon";

      await supabase
        .from("orders")
        .update({ status: "completed", completed_at: nowISO })
        .eq("id", order.id);

      // Idempotent addon application
      const addons = order.addons as Array<{ type: string; quantity: number }> | null;
      await applyAddonsIfNeeded(supabase, order.id, order.user_id, addons);

      if (isAddonOrder) {
        await supabase.from("payment_history").insert({
          user_id: order.user_id,
          plan_purchased: order.plan || "addon",
          amount: capturedAmount,
          original_amount: order.addon_amount,
          discount_amount: order.discount_amount,
          final_amount: capturedAmount,
          payment_method: "paypal",
          status: "completed",
          paid_at: nowISO,
          order_id: order.id,
          transaction_id: resource?.id || null,
          description: `Add-on purchase (${order.billing_cycle}) via webhook`,
        });

        await supabase.from("plan_change_logs").insert({
          user_id: order.user_id,
          action_type: "addon_purchase",
          old_plan: order.plan,
          new_plan: order.plan,
          change_source: "paypal_webhook",
          reason: "PayPal webhook addon capture",
        });

        console.log(`[paypal-webhook] Addon order ${order.id} completed via webhook`);
      } else {
        // PLAN ORDER: full profile + workspace update
        const expiresAt = new Date(now);
        if (order.billing_cycle === "yearly") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const { data: oldProfile } = await supabase
          .from("profiles")
          .select("user_plan, plan_expires_at")
          .eq("id", order.user_id)
          .single();

        await supabase
          .from("profiles")
          .update({
            user_plan: order.plan,
            plan_status: "active",
            plan_started_at: nowISO,
            plan_expires_at: expiresAt.toISOString(),
            plan_source: "paypal",
            billing_cycle: order.billing_cycle,
            downgraded_at: null,
          })
          .eq("id", order.user_id);

        await supabase.from("payment_history").insert({
          user_id: order.user_id,
          plan_purchased: order.plan,
          amount: capturedAmount,
          original_amount: order.base_amount + order.addon_amount,
          discount_amount: order.discount_amount,
          final_amount: capturedAmount,
          coupon_code: order.coupon_code,
          payment_method: "paypal",
          status: "completed",
          paid_at: nowISO,
          order_id: order.id,
          transaction_id: resource?.id || null,
          description: `${order.plan} (${order.billing_cycle}) via webhook`,
        });

        await supabase.from("plan_change_logs").insert({
          user_id: order.user_id,
          action_type: "upgrade",
          old_plan: oldProfile?.user_plan || "plan_free",
          new_plan: order.plan,
          old_expires_at: oldProfile?.plan_expires_at,
          new_expires_at: expiresAt.toISOString(),
          change_source: "paypal_webhook",
          reason: "PayPal webhook backup capture",
        });

        // Idempotent coupon increment
        await applyCouponIfNeeded(supabase, order.id, order.coupon_code);

        // Update workspace limits based on new plan
        const { data: planLimits } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan", order.plan)
          .single();

        if (planLimits) {
          await supabase.from("workspaces").update({
            max_projects: planLimits.max_projects_per_workspace,
            max_members: planLimits.max_members_per_workspace,
            max_storage_mb: planLimits.max_storage_mb,
          }).eq("owner_id", order.user_id);
        }

        console.log(`[paypal-webhook] Plan order ${order.id} completed via webhook`);
      }
    } else if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.REFUNDED"
    ) {
      const paypalOrderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;
      if (paypalOrderId) {
        const newStatus = eventType === "PAYMENT.CAPTURE.REFUNDED" ? "refunded" : "failed";
        await supabase
          .from("orders")
          .update({ status: newStatus })
          .eq("paypal_order_id", paypalOrderId);
        console.log(`[paypal-webhook] Order marked as ${newStatus}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[paypal-webhook] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
