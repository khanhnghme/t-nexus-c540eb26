import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`[paypal-webhook] event_type=${eventType}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const paypalOrderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;
      if (!paypalOrderId) {
        console.log("[paypal-webhook] No order ID found in payload");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotent: check if already completed
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

      // Backup capture: update order + profile + logs
      const capturedAmount = parseFloat(resource?.amount?.value || order.total_amount);

      await supabase
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", order.id);

      // Calculate plan expiry
      const now = new Date();
      const expiresAt = order.billing_cycle === "yearly"
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Get old plan for logging
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
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
          plan_source: "paypal",
          billing_cycle: order.billing_cycle,
        })
        .eq("id", order.user_id);

      // Payment history
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
        paid_at: now.toISOString(),
        order_id: order.id,
        transaction_id: resource?.id || null,
        description: `${order.plan} (${order.billing_cycle}) via webhook`,
      });

      // Plan change log
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

      // Increment coupon usage if applicable
      if (order.coupon_code) {
        await supabase.rpc("", {}).catch(() => {});
        // Direct update
        const { data: coupon } = await supabase
          .from("coupons")
          .select("id, used_count")
          .eq("code", order.coupon_code)
          .maybeSingle();
        if (coupon) {
          await supabase
            .from("coupons")
            .update({ used_count: coupon.used_count + 1 })
            .eq("id", coupon.id);
        }
      }

      console.log(`[paypal-webhook] Order ${order.id} completed via webhook`);
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
