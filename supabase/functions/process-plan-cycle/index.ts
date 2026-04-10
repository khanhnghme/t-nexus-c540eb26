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
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const nowISO = now.toISOString();

    // 1. Process scheduled downgrades (next_plan IS NOT NULL AND plan_expires_at <= now)
    const { data: scheduledProfiles, error: fetchError } = await serviceClient
      .from("profiles")
      .select("id, user_plan, plan, next_plan, next_billing_cycle, plan_expires_at")
      .not("next_plan", "is", null)
      .lte("plan_expires_at", nowISO);

    if (fetchError) {
      console.error("Error fetching scheduled profiles:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch profiles" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let transitioned = 0;
    let expired = 0;

    for (const profile of scheduledProfiles || []) {
      const newPlan = profile.next_plan;
      const billingCycle = profile.next_billing_cycle || "monthly";

      const newExpiry = new Date();
      if (billingCycle === "yearly") {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      } else {
        newExpiry.setMonth(newExpiry.getMonth() + 1);
      }

      const { error: updateError } = await serviceClient.from("profiles").update({
        user_plan: newPlan,
        plan: newPlan,
        plan_status: "active",
        plan_started_at: nowISO,
        plan_expires_at: newExpiry.toISOString(),
        billing_cycle: billingCycle,
        next_plan: null,
        next_billing_cycle: null,
        updated_at: nowISO,
      }).eq("id", profile.id);

      if (updateError) {
        console.error(`Error transitioning profile ${profile.id}:`, updateError);
        continue;
      }

      const { data: planLimits } = await serviceClient
        .from("plan_limits")
        .select("*")
        .eq("plan", newPlan)
        .single();

      if (planLimits) {
        await serviceClient.from("workspaces").update({
          max_projects: planLimits.max_projects_per_workspace,
          max_members: planLimits.max_members_per_workspace,
          max_storage_mb: planLimits.max_storage_mb,
        }).eq("owner_id", profile.id);
      }

      await serviceClient.from("plan_change_logs").insert({
        user_id: profile.id,
        action_type: "cycle_transition",
        old_plan: profile.user_plan,
        new_plan: newPlan,
        old_expires_at: profile.plan_expires_at,
        new_expires_at: newExpiry.toISOString(),
        change_source: "system_cron",
        reason: "Scheduled plan transition at cycle end",
      });

      transitioned++;
    }

    // 2. Expired plans: cancelled or payment_failed + past expires_at → downgrade to free
    const { data: expiredProfiles, error: expiredError } = await serviceClient
      .from("profiles")
      .select("id, user_plan, plan_expires_at")
      .is("next_plan", null)
      .neq("user_plan", "plan_free")
      .not("plan_expires_at", "is", null)
      .lte("plan_expires_at", nowISO)
      .in("plan_status", ["cancelled", "payment_failed"]);

    if (!expiredError && expiredProfiles) {
      for (const profile of expiredProfiles) {
        const { error: downgradeError } = await serviceClient.from("profiles").update({
          user_plan: "plan_free",
          plan: "plan_free",
          plan_status: "active",
          plan_source: "system_expired",
          plan_expires_at: null,
          downgraded_at: nowISO,
          next_plan: null,
          next_billing_cycle: null,
          paypal_subscription_id: null,
          paypal_plan_id: null,
          updated_at: nowISO,
        }).eq("id", profile.id);

        if (downgradeError) {
          console.error(`Error expiring profile ${profile.id}:`, downgradeError);
          continue;
        }

        const { data: freeLimits } = await serviceClient
          .from("plan_limits")
          .select("*")
          .eq("plan", "plan_free")
          .single();

        if (freeLimits) {
          await serviceClient.from("workspaces").update({
            max_projects: freeLimits.max_projects_per_workspace,
            max_members: freeLimits.max_members_per_workspace,
            max_storage_mb: freeLimits.max_storage_mb,
          }).eq("owner_id", profile.id);
        }

        await serviceClient.from("plan_change_logs").insert({
          user_id: profile.id,
          action_type: "expired",
          old_plan: profile.user_plan,
          new_plan: "plan_free",
          old_expires_at: profile.plan_expires_at,
          new_expires_at: null,
          change_source: "system_cron",
          reason: "Plan expired (cancelled/payment_failed)",
        });

        expired++;
      }
    }

    console.log(`process-plan-cycle: ${transitioned} transitioned, ${expired} expired`);

    return new Response(
      JSON.stringify({ success: true, transitioned, expired, processed_at: nowISO }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-plan-cycle error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
