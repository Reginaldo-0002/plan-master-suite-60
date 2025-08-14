import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active schedules that are ready to execute
    const { data: schedules, error: schedulesError } = await supabase
      .from('auto_status_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution', new Date().toISOString());

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log(`Processing ${schedules.length} scheduled status changes...`);

    for (const schedule of schedules) {
      try {
        // Update tool status
        const { error: updateError } = await supabase
          .from('tool_status')
          .upsert({
            tool_name: schedule.tool_name,
            status: schedule.target_status,
            message: `Status automaticamente alterado para ${schedule.target_status}`,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          console.error(`Error updating tool ${schedule.tool_name}:`, updateError);
          continue;
        }

        // Calculate next execution time
        const now = new Date();
        let nextExecution = new Date(now);

        switch (schedule.schedule_type) {
          case 'minutes':
            nextExecution.setMinutes(now.getMinutes() + schedule.schedule_value);
            break;
          case 'hours':
            nextExecution.setHours(now.getHours() + schedule.schedule_value);
            break;
          case 'days':
            nextExecution.setDate(now.getDate() + schedule.schedule_value);
            break;
        }

        // Update schedule with next execution time
        const { error: scheduleUpdateError } = await supabase
          .from('auto_status_schedules')
          .update({
            next_execution: nextExecution.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id);

        if (scheduleUpdateError) {
          console.error(`Error updating schedule ${schedule.id}:`, scheduleUpdateError);
        }

        console.log(`✅ Updated ${schedule.tool_name} to ${schedule.target_status}, next execution: ${nextExecution.toISOString()}`);

      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: schedules.length,
      message: `Processed ${schedules.length} scheduled status changes`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-status-processor:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});