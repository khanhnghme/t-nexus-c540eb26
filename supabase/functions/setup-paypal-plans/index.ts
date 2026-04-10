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
    const accessToken = await getPayPalAccessToken();

    // 1. Create Product
    const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "T-Nexus Subscription",
        description: "T-Nexus SaaS subscription plans",
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    });
    const product = await productRes.json();
    if (!product.id) {
      console.error("Failed to create product:", product);
      return new Response(JSON.stringify({ error: "Failed to create PayPal product", details: product }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`Created product: ${product.id}`);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Create Plans (3 plans × 2 cycles × 2 pricing types = 12 plans)
    const results: Array<{ plan_key: string; billing_cycle: string; is_welcome: boolean; paypal_plan_id: string; price: number }> = [];

    for (const planKey of ["plan_plus", "plan_pro", "plan_business"]) {
      for (const cycle of ["monthly", "yearly"] as const) {
        for (const isWelcome of [false, true]) {
          const prices = isWelcome ? WELCOME_PRICES[planKey] : PLAN_PRICES[planKey];
          const price = cycle === "yearly" ? prices.yearly : prices.monthly;
          const interval = cycle === "yearly" ? "YEAR" : "MONTH";
          const planLabel = planKey.replace("plan_", "").toUpperCase();
          const welcomeLabel = isWelcome ? " (Welcome)" : "";

          const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              product_id: product.id,
              name: `T-Nexus ${planLabel} ${cycle}${welcomeLabel}`,
              description: `T-Nexus ${planLabel} plan - ${cycle} billing${welcomeLabel}`,
              billing_cycles: [
                {
                  frequency: { interval_unit: interval, interval_count: 1 },
                  tenure_type: "REGULAR",
                  sequence: 1,
                  total_cycles: 0, // infinite
                  pricing_scheme: {
                    fixed_price: { value: price.toFixed(2), currency_code: "USD" },
                  },
                },
              ],
              payment_preferences: {
                auto_bill_outstanding: true,
                payment_failure_threshold: 3,
              },
            }),
          });

          const plan = await planRes.json();
          if (!plan.id) {
            console.error(`Failed to create plan ${planKey}/${cycle}/${isWelcome}:`, plan);
            continue;
          }

          results.push({
            plan_key: planKey,
            billing_cycle: cycle,
            is_welcome: isWelcome,
            paypal_plan_id: plan.id,
            price,
          });

          console.log(`Created plan: ${plan.id} (${planKey}/${cycle}/${isWelcome ? "welcome" : "regular"})`);
        }
      }
    }

    // 3. Save to DB
    const rows = results.map(r => ({
      plan_key: r.plan_key,
      billing_cycle: r.billing_cycle,
      paypal_product_id: product.id,
      paypal_plan_id: r.paypal_plan_id,
      is_welcome: r.is_welcome,
      price: r.price,
    }));

    const { error: insertError } = await serviceClient.from("paypal_plans").upsert(rows, {
      onConflict: "plan_key,billing_cycle,is_welcome",
    });

    if (insertError) {
      console.error("Failed to save plans to DB:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save plans", details: insertError }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, product_id: product.id, plans_created: results.length, plans: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("setup-paypal-plans error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
