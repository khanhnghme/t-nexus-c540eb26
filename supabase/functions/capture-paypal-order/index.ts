import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

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

async function updateUserAddons(
  serviceClient: any,
  userId: string,
  addons: Array<{ type: string; quantity: number }>
) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };

    const { orderID } = await req.json();
    if (!orderID) {
      return new Response(JSON.stringify({ error: "Missing orderID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await serviceClient
      .from("orders")
      .select("*")
      .eq("paypal_order_id", orderID)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "completed") {
      return new Response(JSON.stringify({ success: true, message: "Already completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capture PayPal order
    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      console.error("PayPal capture failed:", JSON.stringify(captureData));
      await serviceClient.from("orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(JSON.stringify({ error: "Payment capture failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const now = new Date().toISOString();
    const isAddonOrder = order.order_type === "addon";

    // 1. Update order status
    await serviceClient.from("orders").update({
      status: "completed",
      completed_at: now,
    }).eq("id", order.id);

    // 2. Update user addons (for both plan and addon orders)
    const addons = order.addons as Array<{ type: string; quantity: number }> | null;
    if (addons && addons.length > 0) {
      await updateUserAddons(serviceClient, user.id, addons);
    }

    if (isAddonOrder) {
      // ADDON-ONLY: skip profile/plan update, just log payment + history
      const planLabel = (order.plan || "addon").replace("plan_", "").toUpperCase();

      await serviceClient.from("payment_history").insert({
        user_id: user.id,
        plan_purchased: order.plan || "addon",
        amount: order.total_amount,
        currency: "USD",
        status: "completed",
        payment_method: "paypal",
        transaction_id: captureId || orderID,
        order_id: orderID,
        original_amount: order.addon_amount,
        discount_amount: order.discount_amount,
        final_amount: order.total_amount,
        paid_at: now,
        description: `Add-on purchase (${order.billing_cycle})`,
      });

      await serviceClient.from("plan_change_logs").insert({
        user_id: user.id,
        action_type: "addon_purchase",
        old_plan: order.plan,
        new_plan: order.plan,
        change_source: "user_payment",
        reason: `Add-on PayPal payment ${captureId || orderID}`,
        performed_by: user.id,
      });

      return new Response(
        JSON.stringify({ success: true, orderId: order.id, order_type: "addon" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PLAN ORDER: full profile + workspace update
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

    // Determine transition type
    const isUpgrade = newRank > oldRank || oldPlan === "plan_free";
    const isDowngrade = newRank < oldRank && oldPlan !== "plan_free";
    const isRenew = newRank === oldRank && oldPlan !== "plan_free";
    const hasScheduledPlan = !!profile?.next_plan;

    let actionType: string;

    if (isDowngrade) {
      // DOWNGRADE: schedule for next cycle, keep current plan active
      const profileUpdate: Record<string, any> = {
        next_plan: order.plan,
        next_billing_cycle: order.billing_cycle,
        updated_at: now,
      };

      // If user already had a scheduled plan (change of mind), just overwrite
      actionType = hasScheduledPlan ? "change_scheduled_plan" : "downgrade_scheduled";

      await serviceClient.from("profiles").update(profileUpdate).eq("id", user.id);
    } else {
      // UPGRADE or RENEW: immediate switch
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
      }).eq("id", user.id);
    }

    await serviceClient.from("payment_history").insert({
      user_id: user.id,
      plan_purchased: order.plan,
      amount: order.total_amount,
      currency: "USD",
      status: "completed",
      payment_method: "paypal",
      transaction_id: captureId || orderID,
      order_id: orderID,
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
      reason: `PayPal payment ${captureId || orderID}`,
      performed_by: user.id,
    });

    if (order.coupon_code) {
      const { data: coupon } = await serviceClient
        .from("coupons")
        .select("id, used_count")
        .eq("code", order.coupon_code)
        .single();

      if (coupon) {
        await serviceClient.from("coupons").update({
          used_count: (coupon.used_count || 0) + 1,
        }).eq("id", coupon.id);
      }
    }

    // Only update workspace limits for upgrade/renew (not scheduled downgrades)
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

    return new Response(
      JSON.stringify({ success: true, orderId: order.id, plan: order.plan, expires_at: expiryDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("capture-paypal-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
