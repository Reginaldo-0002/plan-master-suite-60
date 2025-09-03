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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { 
      user_email, 
      referral_code, 
      purchase_amount, 
      plan_purchased 
    } = await req.json();

    console.log('🎯 Processing referral:', {
      user_email,
      referral_code,
      purchase_amount,
      plan_purchased
    });

    // Validar dados obrigatórios
    if (!user_email || !referral_code || !purchase_amount || !plan_purchased) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Dados obrigatórios não fornecidos" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Processar o referral através da função SQL
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_referral_purchase',
      {
        referred_user_email: user_email,
        referral_code_used: referral_code,
        purchase_amount: parseFloat(purchase_amount),
        plan_purchased: plan_purchased
      }
    );

    if (error) {
      console.error('❌ Erro ao processar referral:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log('✅ Referral processado:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});