import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_BASE = "https://api-m.paypal.com";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Get our order record
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

    // Calculate plan expiry
    const startDate = new Date();
    const expiryDate = new Date();
    if (order.billing_cycle === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Get old plan for logging
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_plan, plan_expires_at")
      .eq("id", user.id)
      .single();

    const oldPlan = profile?.user_plan || "plan_free";
    const oldExpiry = profile?.plan_expires_at;

    // 1. Update order status
    await serviceClient.from("orders").update({
      status: "completed",
      completed_at: now,
    }).eq("id", order.id);

    // 2. Update user profile
    await serviceClient.from("profiles").update({
      user_plan: order.plan,
      plan_status: "active",
      plan_started_at: startDate.toISOString(),
      plan_expires_at: expiryDate.toISOString(),
      plan_source: "paypal",
      billing_cycle: order.billing_cycle,
      downgraded_at: null,
    }).eq("id", user.id);

    // 3. Insert payment history
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

    // 4. Insert plan change log
    await serviceClient.from("plan_change_logs").insert({
      user_id: user.id,
      action_type: oldPlan === "plan_free" ? "upgrade" : (order.plan === oldPlan ? "renew" : "upgrade"),
      old_plan: oldPlan,
      new_plan: order.plan,
      old_expires_at: oldExpiry,
      new_expires_at: expiryDate.toISOString(),
      change_source: "user_payment",
      reason: `PayPal payment ${captureId || orderID}`,
      performed_by: user.id,
    });

    // 5. Update coupon used count
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

    // 6. Update user addons
    const addons = order.addons as Array<{ type: string; quantity: number }> | null;
    if (addons && addons.length > 0) {
      for (const addon of addons) {
        const { data: existing } = await serviceClient
          .from("user_addons")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("addon_type", addon.type)
          .single();

        if (existing) {
          await serviceClient.from("user_addons").update({
            quantity: existing.quantity + addon.quantity,
          }).eq("id", existing.id);
        } else {
          await serviceClient.from("user_addons").insert({
            user_id: user.id,
            addon_type: addon.type,
            quantity: addon.quantity,
            price_per_unit: 2.49,
          });
        }
      }
    }

    // 7. Update workspace limits based on new plan
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

    return new Response(
      JSON.stringify({ success: true, plan: order.plan, expires_at: expiryDate.toISOString() }),
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
