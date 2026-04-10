const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";

  return new Response(
    JSON.stringify({ clientId, vault: true, intent: "subscription" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
