import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.sandbox.paypal.com";

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

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ addons_applied: true })
    .eq("id", orderId)
    .eq("addons_applied", false)
    .select("id")
    .maybeSingle();

  if (error || !updated) return;

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

  if (error || !updated) return;

  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, used_count")
    .eq("code", couponCode)
    .maybeSingle();

  if (coupon) {
    await supabase.from("coupons").update({ used_count: coupon.used_count + 1 }).eq("id", coupon.id);
  }
}

/* ═══ Main Handler ═══ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();

    const isValid = await verifyWebhookSignature(req, bodyText);
    if (!isValid) {
      console.error("[paypal-webhook] Invalid webhook signature, rejecting");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`[paypal-webhook] event_type=${eventType}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ═══ BILLING.SUBSCRIPTION.ACTIVATED ═══ */
    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const subscriptionId = resource?.id;
      if (!subscriptionId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("paypal_subscription_id", subscriptionId)
        .maybeSingle();

      if (!order) {
        console.log(`[paypal-webhook] ACTIVATED: No order for subscription ${subscriptionId}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status === "completed") {
        console.log(`[paypal-webhook] ACTIVATED: Order ${order.id} already completed`);
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const nowISO = now.toISOString();
      const isAddonOrder = order.order_type === "addon";

      // Mark order completed
      await supabase.from("orders").update({
        status: "completed",
        completed_at: nowISO,
      }).eq("id", order.id);

      // Apply addons
      const addons = order.addons as Array<{ type: string; quantity: number }> | null;
      await applyAddonsIfNeeded(supabase, order.id, order.user_id, addons);

      if (isAddonOrder) {
        await supabase.from("payment_history").insert({
          user_id: order.user_id,
          plan_purchased: order.plan || "addon",
          amount: order.total_amount,
          original_amount: order.addon_amount,
          discount_amount: order.discount_amount,
          final_amount: order.total_amount,
          payment_method: "paypal",
          status: "completed",
          paid_at: nowISO,
          order_id: order.id,
          transaction_id: subscriptionId,
          description: `Add-on subscription (${order.billing_cycle}) via webhook`,
        });

        await supabase.from("plan_change_logs").insert({
          user_id: order.user_id,
          action_type: "addon_purchase",
          old_plan: order.plan,
          new_plan: order.plan,
          change_source: "paypal_webhook",
          reason: `Subscription activated ${subscriptionId}`,
        });

        console.log(`[paypal-webhook] ACTIVATED: Addon order ${order.id} completed`);
      } else {
        // Plan order
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

        await supabase.from("profiles").update({
          user_plan: order.plan,
          plan_status: "active",
          plan_started_at: nowISO,
          plan_expires_at: expiresAt.toISOString(),
          plan_source: "paypal",
          billing_cycle: order.billing_cycle,
          downgraded_at: null,
          next_plan: null,
          next_billing_cycle: null,
          paypal_subscription_id: subscriptionId,
          paypal_plan_id: order.plan,
        }).eq("id", order.user_id);

        await supabase.from("payment_history").insert({
          user_id: order.user_id,
          plan_purchased: order.plan,
          amount: order.total_amount,
          original_amount: order.base_amount + order.addon_amount,
          discount_amount: order.discount_amount,
          final_amount: order.total_amount,
          coupon_code: order.coupon_code,
          payment_method: "paypal",
          status: "completed",
          paid_at: nowISO,
          order_id: order.id,
          transaction_id: subscriptionId,
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
          reason: `Subscription activated ${subscriptionId}`,
        });

        await applyCouponIfNeeded(supabase, order.id, order.coupon_code);

        // Update workspace limits
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

        console.log(`[paypal-webhook] ACTIVATED: Plan order ${order.id} completed`);
      }
    }

    /* ═══ PAYMENT.SALE.COMPLETED — Recurring payment ═══ */
    else if (eventType === "PAYMENT.SALE.COMPLETED") {
      const billingAgreementId = resource?.billing_agreement_id;
      if (!billingAgreementId) {
        console.log("[paypal-webhook] SALE.COMPLETED: No billing_agreement_id");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user profile by subscription ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_plan, plan_expires_at, billing_cycle, paypal_subscription_id")
        .eq("paypal_subscription_id", billingAgreementId)
        .maybeSingle();

      if (!profile) {
        // Could be the initial payment from ACTIVATED — skip
        console.log(`[paypal-webhook] SALE.COMPLETED: No profile for agreement ${billingAgreementId}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extend plan_expires_at by 1 cycle
      const currentExpiry = profile.plan_expires_at ? new Date(profile.plan_expires_at) : new Date();
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));

      if (profile.billing_cycle === "yearly") {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      } else {
        newExpiry.setMonth(newExpiry.getMonth() + 1);
      }

      await supabase.from("profiles").update({
        plan_expires_at: newExpiry.toISOString(),
        plan_status: "active",
        updated_at: new Date().toISOString(),
      }).eq("id", profile.id);

      // Record payment history
      const amount = parseFloat(resource?.amount?.total || "0");
      await supabase.from("payment_history").insert({
        user_id: profile.id,
        plan_purchased: profile.user_plan,
        amount,
        currency: resource?.amount?.currency || "USD",
        status: "completed",
        payment_method: "paypal",
        transaction_id: resource?.id,
        paid_at: new Date().toISOString(),
        description: `Recurring payment (${profile.billing_cycle})`,
        final_amount: amount,
      });

      console.log(`[paypal-webhook] SALE.COMPLETED: Extended ${profile.id} to ${newExpiry.toISOString()}`);
    }

    /* ═══ BILLING.SUBSCRIPTION.CANCELLED ═══ */
    else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
      const subscriptionId = resource?.id;
      if (!subscriptionId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_plan, plan_expires_at")
        .eq("paypal_subscription_id", subscriptionId)
        .maybeSingle();

      if (profile) {
        await supabase.from("profiles").update({
          plan_status: "cancelled",
          auto_renew: false,
          updated_at: new Date().toISOString(),
        }).eq("id", profile.id);

        await supabase.from("plan_change_logs").insert({
          user_id: profile.id,
          action_type: "subscription_cancelled",
          old_plan: profile.user_plan,
          new_plan: profile.user_plan,
          old_expires_at: profile.plan_expires_at,
          new_expires_at: profile.plan_expires_at,
          change_source: "paypal_webhook",
          reason: `Subscription cancelled by user ${subscriptionId}`,
        });

        console.log(`[paypal-webhook] CANCELLED: Profile ${profile.id} set to cancelled`);
      }
    }

    /* ═══ BILLING.SUBSCRIPTION.PAYMENT.FAILED ═══ */
    else if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
      const subscriptionId = resource?.id;
      if (!subscriptionId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_plan, plan_expires_at")
        .eq("paypal_subscription_id", subscriptionId)
        .maybeSingle();

      if (profile) {
        await supabase.from("profiles").update({
          plan_status: "payment_failed",
          updated_at: new Date().toISOString(),
        }).eq("id", profile.id);

        await supabase.from("plan_change_logs").insert({
          user_id: profile.id,
          action_type: "payment_failed",
          old_plan: profile.user_plan,
          new_plan: profile.user_plan,
          old_expires_at: profile.plan_expires_at,
          new_expires_at: profile.plan_expires_at,
          change_source: "paypal_webhook",
          reason: `Payment failed for subscription ${subscriptionId}`,
        });

        console.log(`[paypal-webhook] PAYMENT.FAILED: Profile ${profile.id}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[paypal-webhook] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
