
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting plan expiration check...');

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    // Check for users needing 7-day reminder
    const { data: sevenDayUsers, error: sevenDayError } = await supabaseClient
      .from('plan_expiration_queue')
      .select(`
        *,
        profiles!inner(user_id, full_name, plan)
      `)
      .lte('expiration_date', sevenDaysFromNow.toISOString())
      .gte('expiration_date', now.toISOString())
      .eq('reminder_7_days', false);

    if (sevenDayError) {
      console.error('Error fetching 7-day users:', sevenDayError);
    } else {
      console.log(`Found ${sevenDayUsers?.length || 0} users for 7-day reminder`);
      
      for (const user of sevenDayUsers || []) {
        // Send 7-day reminder
        await supabaseClient
          .from('notifications')
          .insert({
            title: 'Seu plano expira em 7 dias',
            message: `Olá ${user.profiles.full_name || 'usuário'}! Seu plano ${user.profiles.plan.toUpperCase()} expira em 7 dias. Renove agora para continuar aproveitando todos os benefícios.`,
            type: 'warning',
            target_users: [user.user_id],
            expires_at: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()
          });

        // Mark as sent
        await supabaseClient
          .from('plan_expiration_queue')
          .update({ reminder_7_days: true })
          .eq('id', user.id);

        console.log(`Sent 7-day reminder to user ${user.user_id}`);
      }
    }

    // Check for users needing 1-day reminder
    const { data: oneDayUsers, error: oneDayError } = await supabaseClient
      .from('plan_expiration_queue')
      .select(`
        *,
        profiles!inner(user_id, full_name, plan)
      `)
      .lte('expiration_date', oneDayFromNow.toISOString())
      .gte('expiration_date', now.toISOString())
      .eq('reminder_1_day', false);

    if (oneDayError) {
      console.error('Error fetching 1-day users:', oneDayError);
    } else {
      console.log(`Found ${oneDayUsers?.length || 0} users for 1-day reminder`);
      
      for (const user of oneDayUsers || []) {
        // Send 1-day reminder
        await supabaseClient
          .from('notifications')
          .insert({
            title: 'Seu plano expira amanhã!',
            message: `Atenção ${user.profiles.full_name || 'usuário'}! Seu plano ${user.profiles.plan.toUpperCase()} expira amanhã. Renove agora para evitar a interrupção dos seus acessos.`,
            type: 'error',
            target_users: [user.user_id],
            expires_at: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()
          });

        // Mark as sent
        await supabaseClient
          .from('plan_expiration_queue')
          .update({ reminder_1_day: true })
          .eq('id', user.id);

        console.log(`Sent 1-day reminder to user ${user.user_id}`);
      }
    }

    // Check for expired users
    const { data: expiredUsers, error: expiredError } = await supabaseClient
      .from('plan_expiration_queue')
      .select(`
        *,
        profiles!inner(user_id, full_name, plan)
      `)
      .lte('expiration_date', now.toISOString())
      .eq('expiration_notice', false);

    if (expiredError) {
      console.error('Error fetching expired users:', expiredError);
    } else {
      console.log(`Found ${expiredUsers?.length || 0} users with expired plans`);
      
      for (const user of expiredUsers || []) {
        // Send expiration notice
        await supabaseClient
          .from('notifications')
          .insert({
            title: 'Seu plano expirou',
            message: `${user.profiles.full_name || 'Usuário'}, seu plano ${user.profiles.plan.toUpperCase()} expirou. Você tem 24 horas para renovar antes do downgrade automático.`,
            type: 'error',
            target_users: [user.user_id],
            expires_at: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()
          });

        // Mark as notified
        await supabaseClient
          .from('plan_expiration_queue')
          .update({ expiration_notice: true })
          .eq('id', user.id);

        console.log(`Sent expiration notice to user ${user.user_id}`);
      }
    }

    // Check for users to downgrade (24 hours after expiration)
    const { data: downgradeUsers, error: downgradeError } = await supabaseClient
      .from('plan_expiration_queue')
      .select(`
        *,
        profiles!inner(user_id, full_name, plan, auto_renewal)
      `)
      .lte('expiration_date', twentyFourHoursAgo.toISOString())
      .eq('downgrade_executed', false);

    if (downgradeError) {
      console.error('Error fetching downgrade users:', downgradeError);
    } else {
      console.log(`Found ${downgradeUsers?.length || 0} users to downgrade`);
      
      for (const user of downgradeUsers || []) {
        // Don't downgrade if auto_renewal is enabled (assume payment will be processed)
        if (!user.profiles.auto_renewal) {
          // Downgrade to free plan
          await supabaseClient
            .from('profiles')
            .update({
              plan: 'free',
              plan_status: 'expired',
              plan_end_date: null
            })
            .eq('user_id', user.user_id);

          // Send downgrade notification
          await supabaseClient
            .from('notifications')
            .insert({
              title: 'Sua conta foi alterada para o plano gratuito',
              message: `${user.profiles.full_name || 'Usuário'}, como seu plano ${user.profiles.plan.toUpperCase()} expirou há mais de 24 horas, sua conta foi automaticamente alterada para o plano gratuito.`,
              type: 'info',
              target_users: [user.user_id],
              expires_at: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()
            });

          console.log(`Downgraded user ${user.user_id} to free plan`);
        }

        // Mark as processed
        await supabaseClient
          .from('plan_expiration_queue')
          .update({ downgrade_executed: true })
          .eq('id', user.id);
      }
    }

    console.log('Plan expiration check completed successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Plan expiration check completed',
        sevenDayReminders: sevenDayUsers?.length || 0,
        oneDayReminders: oneDayUsers?.length || 0,
        expirationNotices: expiredUsers?.length || 0,
        downgrades: downgradeUsers?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in plan expiration checker:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
