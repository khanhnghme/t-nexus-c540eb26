import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.sandbox.paypal.com";

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  plan_plus: { monthly: 4.8, yearly: 48 },
  plan_pro: { monthly: 12, yearly: 120 },
  plan_business: { monthly: 24, yearly: 240 },
};

const WELCOME_PRICES: Record<string, { monthly: number; yearly: number }> = {
  plan_plus: { monthly: 3.9, yearly: 39 },
  plan_pro: { monthly: 9.9, yearly: 99 },
  plan_business: { monthly: 21.9, yearly: 219 },
};

const ADDON_PRICE = 2.49;

const ADDON_DISCOUNT_RATE: Record<string, number> = {
  plan_plus: 0.10,
  plan_pro: 0.20,
  plan_business: 0.20,
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

    const body = await req.json();
    const { plan, billing_cycle = "monthly", addons = [], coupon_code, order_type = "plan" } = body;

    if (!["plan", "addon"].includes(order_type)) {
      return new Response(JSON.stringify({ error: "Invalid order_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["monthly", "yearly"].includes(billing_cycle)) {
      return new Response(JSON.stringify({ error: "Invalid billing cycle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let effectivePlan = plan;

    if (order_type === "addon") {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("user_plan, billing_cycle")
        .eq("id", user.id)
        .single();

      if (!profile || profile.user_plan === "plan_free") {
        return new Response(JSON.stringify({ error: "Add-ons require a premium plan" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      effectivePlan = profile.user_plan;

      if (!addons || addons.length === 0) {
        return new Response(JSON.stringify({ error: "No addons specified" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!plan || !PLAN_PRICES[plan]) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Determine if first-time buyer (for welcome pricing)
    let isFirstTimeBuyer = false;
    if (order_type === "plan") {
      const { data: completedOrders } = await serviceClient
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .limit(1);
      isFirstTimeBuyer = !completedOrders || completedOrders.length === 0;
    }

    // Calculate amounts for order record
    let baseAmount = 0;
    let originalAmount = 0;
    let welcomeDiscountAmount = 0;

    if (order_type === "plan") {
      const prices = PLAN_PRICES[plan];
      originalAmount = billing_cycle === "yearly" ? prices.yearly : prices.monthly;
      baseAmount = originalAmount;

      if (isFirstTimeBuyer && WELCOME_PRICES[plan]) {
        const wp = WELCOME_PRICES[plan];
        baseAmount = billing_cycle === "yearly" ? wp.yearly : wp.monthly;
        welcomeDiscountAmount = Math.round((originalAmount - baseAmount) * 100) / 100;
      }
    }

    // Calculate addon amounts
    const addonDiscountRate = ADDON_DISCOUNT_RATE[effectivePlan] || 0;
    let addonAmountOriginal = 0;
    let addonAmountFinal = 0;
    const validAddons: Array<{ type: string; quantity: number }> = [];

    for (const addon of addons) {
      if (addon.quantity > 0 && ["projects", "storage", "members"].includes(addon.type)) {
        const qty = Math.min(Math.max(1, Math.floor(addon.quantity)), 10);
        const originalPrice = billing_cycle === "yearly" ? ADDON_PRICE * 10 * qty : ADDON_PRICE * qty;
        addonAmountOriginal += originalPrice;
        addonAmountFinal += originalPrice * (1 - addonDiscountRate);
        validAddons.push({ type: addon.type, quantity: qty });
      }
    }
    addonAmountFinal = Math.round(addonAmountFinal * 100) / 100;

    // Validate coupon
    let discountAmount = 0;
    let validCouponCode: string | null = null;

    if (coupon_code && order_type === "plan") {
      const { data: coupon } = await serviceClient
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (coupon) {
        const now = new Date();
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now;
        const notStarted = !coupon.starts_at || new Date(coupon.starts_at) <= now;
        const hasUses = coupon.max_uses === null || coupon.used_count < coupon.max_uses;
        const planApplicable = !coupon.applicable_plans?.length || coupon.applicable_plans.includes(plan);

        const { data: existingOrders } = await serviceClient
          .from("orders")
          .select("id")
          .eq("user_id", user.id)
          .eq("coupon_code", coupon.code)
          .eq("status", "completed")
          .limit(1);

        const notUsedByUser = !existingOrders || existingOrders.length === 0;

        if (notExpired && notStarted && hasUses && planApplicable && notUsedByUser) {
          const subtotal = baseAmount + addonAmountFinal;
          if (coupon.discount_type === "percentage") {
            discountAmount = Math.round((subtotal * coupon.discount_value / 100) * 100) / 100;
          } else {
            discountAmount = Math.min(coupon.discount_value, subtotal);
          }
          validCouponCode = coupon.code;
        }
      }
    }

    const totalAmount = Math.round((baseAmount + addonAmountFinal - discountAmount) * 100) / 100;

    if (totalAmount <= 0) {
      return new Response(JSON.stringify({ error: "Total must be greater than 0" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up PayPal Plan ID from paypal_plans table
    const useWelcome = order_type === "plan" && isFirstTimeBuyer && !!WELCOME_PRICES[plan];

    const { data: paypalPlan } = await serviceClient
      .from("paypal_plans")
      .select("paypal_plan_id")
      .eq("plan_key", order_type === "addon" ? effectivePlan : plan)
      .eq("billing_cycle", billing_cycle)
      .eq("is_welcome", useWelcome)
      .single();

    if (!paypalPlan) {
      console.error("No PayPal plan found for:", { plan: order_type === "addon" ? effectivePlan : plan, billing_cycle, useWelcome });
      return new Response(JSON.stringify({ error: "PayPal plan not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create PayPal subscription
    const accessToken = await getPayPalAccessToken();

    const subscriptionBody: Record<string, any> = {
      plan_id: paypalPlan.paypal_plan_id,
      application_context: {
        brand_name: "T-Nexus",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/capture-paypal-order`,
        cancel_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/capture-paypal-order`,
      },
      custom_id: user.id,
    };

    // If coupon discount exists, override the first cycle price
    if (discountAmount > 0) {
      const discountedPrice = Math.round((totalAmount) * 100) / 100;
      subscriptionBody.plan = {
        billing_cycles: [
          {
            sequence: 1,
            tenure_type: "REGULAR",
            pricing_scheme: {
              fixed_price: {
                value: discountedPrice.toFixed(2),
                currency_code: "USD",
              },
            },
          },
        ],
      };
    }

    // For addon orders, use setup_fee to charge addon amount
    if (order_type === "addon" && addonAmountFinal > 0) {
      subscriptionBody.plan = {
        ...(subscriptionBody.plan || {}),
        payment_preferences: {
          setup_fee: {
            value: addonAmountFinal.toFixed(2),
            currency_code: "USD",
          },
        },
      };
    }

    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(subscriptionBody),
    });

    const subscription = await subRes.json();

    if (!subscription.id) {
      console.error("PayPal subscription creation failed:", JSON.stringify(subscription));
      return new Response(JSON.stringify({ error: "Failed to create PayPal subscription" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approveLink = subscription.links?.find((l: any) => l.rel === "approve")?.href;

    // Save order to DB
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data: insertedOrder } = await serviceClient.from("orders").insert({
      user_id: user.id,
      order_type,
      plan: order_type === "addon" ? effectivePlan : plan,
      billing_cycle,
      base_amount: baseAmount,
      addon_amount: addonAmountFinal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      coupon_code: validCouponCode,
      addons: validAddons,
      payment_method: "paypal",
      paypal_subscription_id: subscription.id,
      status: "pending",
      welcome_discount: welcomeDiscountAmount,
      expires_at: expiresAt,
    }).select("order_code").single();

    return new Response(
      JSON.stringify({
        subscriptionID: subscription.id,
        approveUrl: approveLink,
        expiresAt,
        orderCode: insertedOrder?.order_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-paypal-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
