import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Platform checkout function called");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    if (!userData.user?.email) throw new Error("User not authenticated or email not available");

    const { platform, plan_slug } = await req.json();
    console.log("📋 Request data:", { platform, plan_slug, user_email: userData.user.email });

    // Chamar função RPC do banco
    const { data: checkoutData, error: checkoutError } = await supabaseClient.rpc(
      'create_platform_checkout',
      {
        platform_name: platform,
        plan_slug: plan_slug,
        user_email: userData.user.email
      }
    );

    if (checkoutError) {
      console.error("❌ RPC Error:", checkoutError);
      throw checkoutError;
    }

    console.log("✅ Checkout data:", checkoutData);

    return new Response(JSON.stringify(checkoutData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});