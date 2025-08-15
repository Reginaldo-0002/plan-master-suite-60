
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendChatMessage(supabaseClient: any, notification: any) {
  try {
    // Buscar ou criar ticket de suporte para o usuário
    let ticketId;
    
    const { data: existingTicket } = await supabaseClient
      .from('support_tickets')
      .select('id')
      .eq('user_id', notification.recipient_user_id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingTicket) {
      ticketId = existingTicket.id;
    } else {
      // Criar novo ticket
      const { data: newTicket, error: ticketError } = await supabaseClient
        .from('support_tickets')
        .insert({
          user_id: notification.recipient_user_id,
          subject: 'Mensagem do Suporte',
          description: 'Mensagem agendada do administrador',
          status: 'open',
          priority: 'normal',
          assigned_to: notification.created_by
        })
        .select()
        .single();

      if (ticketError) throw ticketError;
      ticketId = newTicket.id;
    }

    // Enviar mensagem no chat
    const { error: messageError } = await supabaseClient
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: notification.created_by || 'admin',
        message: notification.message,
        is_bot: false,
        is_internal: false
      });

    if (messageError) throw messageError;

    console.log(`Scheduled chat message sent to user ${notification.recipient_user_id}`);
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
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

    console.log('Starting auto notification sender...');

    const now = new Date();

    // Get scheduled notifications that should be sent now
    const { data: scheduledNotifications, error: fetchError } = await supabaseClient
      .from('scheduled_notifications')
      .select('*')
      .lte('scheduled_at', now.toISOString())
      .eq('sent', false);

    if (fetchError) {
      console.error('Error fetching scheduled notifications:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledNotifications?.length || 0} notifications to send`);

    for (const notification of scheduledNotifications || []) {
      try {
        let targetUsers = notification.target_users;
        
        // If it's a personal message, use the recipient_user_id
        if (notification.is_personal_message && notification.recipient_user_id) {
          targetUsers = [notification.recipient_user_id];
        }

        // Check if this is a chat message
        if (notification.notification_type === 'chat_message' && notification.is_personal_message && notification.recipient_user_id) {
          // Send as chat message instead of notification
          await sendChatMessage(supabaseClient, notification);
        } else {
          // Create regular notification
          const { error: insertError } = await supabaseClient
            .from('notifications')
            .insert({
              title: notification.title,
              message: notification.message,
              type: notification.notification_type || 'info',
              target_users: targetUsers,
              target_plans: notification.target_plans,
              is_active: true,
              expires_at: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString() // Expires in 30 days
            });

          if (insertError) {
            console.error(`Error creating notification ${notification.id}:`, insertError);
            continue;
          }
        }

        // Mark as sent
        const { error: updateError } = await supabaseClient
          .from('scheduled_notifications')
          .update({ sent: true })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`Error marking notification ${notification.id} as sent:`, updateError);
        }

        console.log(`Successfully sent notification: ${notification.title}`);

      } catch (notificationError) {
        console.error(`Error processing notification ${notification.id}:`, notificationError);
      }
    }

    console.log('Auto notification sender completed successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Auto notification sender completed',
        notificationsSent: scheduledNotifications?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in auto notification sender:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
