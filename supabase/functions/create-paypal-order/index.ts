import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_BASE = "https://api-m.paypal.com";

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
    const { plan, billing_cycle = "monthly", addons = [], coupon_code } = body;

    if (!plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
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

    // Check if first-time buyer (no completed orders)
    const { data: completedOrders } = await serviceClient
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .limit(1);

    const isFirstTimeBuyer = !completedOrders || completedOrders.length === 0;

    const prices = PLAN_PRICES[plan];
    const welcomePrices = WELCOME_PRICES[plan];
    const originalAmount = billing_cycle === "yearly" ? prices.yearly : prices.monthly;

    let baseAmount = originalAmount;
    let welcomeDiscountAmount = 0;

    if (isFirstTimeBuyer && welcomePrices) {
      baseAmount = billing_cycle === "yearly" ? welcomePrices.yearly : welcomePrices.monthly;
      welcomeDiscountAmount = Math.round((originalAmount - baseAmount) * 100) / 100;
    }

    // Calculate addon amount WITH plan-based discount
    const addonDiscountRate = ADDON_DISCOUNT_RATE[plan] || 0;
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

    if (coupon_code) {
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

    // Create PayPal order
    const accessToken = await getPayPalAccessToken();
    const planLabel = plan.replace("plan_", "").charAt(0).toUpperCase() + plan.replace("plan_", "").slice(1);

    const paypalRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: { currency_code: "USD", value: (baseAmount + addonAmountFinal).toFixed(2) },
              discount: { currency_code: "USD", value: discountAmount.toFixed(2) },
            },
          },
          description: `T-Nexus ${planLabel} Plan (${billing_cycle})`,
        }],
      }),
    });

    const paypalOrder = await paypalRes.json();

    if (!paypalOrder.id) {
      console.error("PayPal error:", JSON.stringify(paypalOrder));
      return new Response(JSON.stringify({ error: "Failed to create PayPal order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save order to DB
    await serviceClient.from("orders").insert({
      user_id: user.id,
      plan,
      billing_cycle,
      base_amount: baseAmount,
      addon_amount: addonAmountFinal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      coupon_code: validCouponCode,
      addons: validAddons,
      payment_method: "paypal",
      paypal_order_id: paypalOrder.id,
      status: "pending",
      welcome_discount: welcomeDiscountAmount,
    });

    return new Response(
      JSON.stringify({ orderID: paypalOrder.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-paypal-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
