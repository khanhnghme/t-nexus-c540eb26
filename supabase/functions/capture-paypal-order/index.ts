import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.sandbox.paypal.com";

const PLAN_RANK: Record<string, number> = {
  plan_free: 0,
  plan_plus: 1,
  plan_pro: 2,
  plan_business: 3,
  plan_custom: 4,
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get PayPal access token");
  return data.access_token;
}

/* ═══ Idempotent Addon Update ═══ */
async function applyAddonsIfNeeded(
  serviceClient: any,
  orderId: string,
  userId: string,
  addons: Array<{ type: string; quantity: number }> | null
) {
  if (!addons || addons.length === 0) return;

  const { data: updated, error } = await serviceClient
    .from("orders")
    .update({ addons_applied: true })
    .eq("id", orderId)
    .eq("addons_applied", false)
    .select("id")
    .maybeSingle();

  if (error || !updated) return;

  for (const addon of addons) {
    const { data: existing } = await serviceClient
      .from("user_addons")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("addon_type", addon.type)
      .single();

    if (existing) {
      await serviceClient.from("user_addons").update({
        quantity: existing.quantity + addon.quantity,
      }).eq("id", existing.id);
    } else {
      await serviceClient.from("user_addons").insert({
        user_id: userId,
        addon_type: addon.type,
        quantity: addon.quantity,
      });
    }
  }
}

/* ═══ Idempotent Coupon Update ═══ */
async function applyCouponIfNeeded(serviceClient: any, orderId: string, couponCode: string | null) {
  if (!couponCode) return;

  const { data: updated, error } = await serviceClient
    .from("orders")
    .update({ coupon_applied: true })
    .eq("id", orderId)
    .eq("coupon_applied", false)
    .select("id")
    .maybeSingle();

  if (error || !updated) return;

  const { data: coupon } = await serviceClient
    .from("coupons")
    .select("id, used_count")
    .eq("code", couponCode)
    .single();

  if (coupon) {
    await serviceClient.from("coupons").update({
      used_count: (coupon.used_count || 0) + 1,
    }).eq("id", coupon.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subscriptionID } = await req.json();
    if (!subscriptionID) {
      return new Response(JSON.stringify({ error: "Missing subscriptionID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await serviceClient
      .from("orders")
      .select("*")
      .eq("paypal_subscription_id", subscriptionID)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "completed") {
      return new Response(JSON.stringify({ success: true, message: "Already completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    const isExpired = order.status === "expired" || (order.expires_at && new Date(order.expires_at) < new Date());
    if (isExpired) {
      if (order.status !== "expired") {
        await serviceClient.from("orders").update({ status: "expired" }).eq("id", order.id);
      }
      return new Response(JSON.stringify({ error: "Order expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify subscription status with PayPal
    const accessToken = await getPayPalAccessToken();
    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionID}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const subscription = await subRes.json();

    if (subscription.status !== "ACTIVE") {
      console.log(`[verify] Subscription ${subscriptionID} status: ${subscription.status}`);
      return new Response(JSON.stringify({ 
        success: true, 
        pending: true,
        status: subscription.status,
        message: "Subscription not yet active — polling will complete" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Subscription is ACTIVE — complete the order
    const now = new Date().toISOString();
    const isAddonOrder = order.order_type === "addon";

    // 1. Update order
    await serviceClient.from("orders").update({
      status: "completed",
      completed_at: now,
    }).eq("id", order.id);

    // 2. Apply addons
    const addons = order.addons as Array<{ type: string; quantity: number }> | null;
    await applyAddonsIfNeeded(serviceClient, order.id, user.id, addons);

    if (isAddonOrder) {
      await serviceClient.from("payment_history").insert({
        user_id: user.id,
        plan_purchased: order.plan || "addon",
        amount: order.total_amount,
        currency: "USD",
        status: "completed",
        payment_method: "paypal",
        transaction_id: subscriptionID,
        order_id: order.id,
        original_amount: order.addon_amount,
        discount_amount: order.discount_amount,
        final_amount: order.total_amount,
        paid_at: now,
        description: `Add-on subscription (${order.billing_cycle})`,
      });

      // Fire-and-forget: send payment confirmation email
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-confirmation-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ orderId: order.id, userId: user.id }),
        });
      } catch (emailErr) {
        console.warn("[capture] Payment email failed (non-blocking):", emailErr);
      }

      return new Response(
        JSON.stringify({ success: true, orderId: order.id, order_type: "addon" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PLAN ORDER
    const startDate = new Date();
    const expiryDate = new Date();
    if (order.billing_cycle === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_plan, plan_expires_at, next_plan")
      .eq("id", user.id)
      .single();

    const oldPlan = profile?.user_plan || "plan_free";
    const oldExpiry = profile?.plan_expires_at;
    const oldRank = PLAN_RANK[oldPlan] ?? 0;
    const newRank = PLAN_RANK[order.plan] ?? 0;

    const isUpgrade = newRank > oldRank || oldPlan === "plan_free";
    const isDowngrade = newRank < oldRank && oldPlan !== "plan_free";

    let actionType: string;

    if (isDowngrade) {
      actionType = profile?.next_plan ? "change_scheduled_plan" : "downgrade_scheduled";
      await serviceClient.from("profiles").update({
        next_plan: order.plan,
        next_billing_cycle: order.billing_cycle,
        paypal_subscription_id: subscriptionID,
        updated_at: now,
      }).eq("id", user.id);
    } else {
      actionType = isUpgrade ? "upgrade" : "renew";
      await serviceClient.from("profiles").update({
        user_plan: order.plan,
        plan_status: "active",
        plan_started_at: startDate.toISOString(),
        plan_expires_at: expiryDate.toISOString(),
        plan_source: "paypal",
        billing_cycle: order.billing_cycle,
        downgraded_at: null,
        next_plan: null,
        next_billing_cycle: null,
        paypal_subscription_id: subscriptionID,
        paypal_plan_id: order.plan,
      }).eq("id", user.id);
    }

    await serviceClient.from("payment_history").insert({
      user_id: user.id,
      plan_purchased: order.plan,
      amount: order.total_amount,
      currency: "USD",
      status: "completed",
      payment_method: "paypal",
      transaction_id: subscriptionID,
      order_id: order.id,
      coupon_code: order.coupon_code,
      original_amount: order.base_amount + order.addon_amount,
      discount_amount: order.discount_amount,
      final_amount: order.total_amount,
      paid_at: now,
      description: `${order.plan.replace("plan_", "").toUpperCase()} plan (${order.billing_cycle})`,
    });

    await serviceClient.from("plan_change_logs").insert({
      user_id: user.id,
      action_type: actionType,
      old_plan: oldPlan,
      new_plan: order.plan,
      old_expires_at: oldExpiry,
      new_expires_at: isDowngrade ? oldExpiry : expiryDate.toISOString(),
      change_source: "user_payment",
      reason: `PayPal subscription ${subscriptionID}`,
      performed_by: user.id,
    });

    await applyCouponIfNeeded(serviceClient, order.id, order.coupon_code);

    if (!isDowngrade) {
      const { data: planLimits } = await serviceClient
        .from("plan_limits")
        .select("*")
        .eq("plan", order.plan)
        .single();

      if (planLimits) {
        await serviceClient.from("workspaces").update({
          max_projects: planLimits.max_projects_per_workspace,
          max_members: planLimits.max_members_per_workspace,
          max_storage_mb: planLimits.max_storage_mb,
        }).eq("owner_id", user.id);
      }
    }

    // Fire-and-forget: send payment confirmation email
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-confirmation-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ orderId: order.id, userId: user.id }),
      });
    } catch (emailErr) {
      console.warn("[capture] Payment email failed (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, orderId: order.id, plan: order.plan, expires_at: expiryDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("capture-paypal-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
