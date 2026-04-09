import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
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
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, plan } = await req.json();
    if (!code || !plan) {
      return new Response(JSON.stringify({ valid: false, error: "Missing code or plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find coupon
    const { data: coupon } = await serviceClient
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (!coupon) {
      return new Response(JSON.stringify({ valid: false, error: "invalid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return new Response(JSON.stringify({ valid: false, error: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return new Response(JSON.stringify({ valid: false, error: "not_started" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({ valid: false, error: "max_uses" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.applicable_plans?.length && !coupon.applicable_plans.includes(plan)) {
      return new Response(JSON.stringify({ valid: false, error: "not_applicable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check per-user usage: has this user already used this coupon code in a completed order?
    const { data: existingOrders } = await serviceClient
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("coupon_code", coupon.code)
      .eq("status", "completed")
      .limit(1);

    if (existingOrders && existingOrders.length > 0) {
      return new Response(JSON.stringify({ valid: false, error: "already_used" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      code: coupon.code,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validate-coupon error:", err);
    return new Response(JSON.stringify({ valid: false, error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
