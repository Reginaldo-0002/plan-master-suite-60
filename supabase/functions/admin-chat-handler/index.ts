
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'forward_to_admin' | 'respond_to_user' | 'close_chat';
  userId?: string;
  message?: string;
  queueItemId?: string;
  adminId?: string;
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

    const { action, userId, message, queueItemId, adminId }: RequestBody = await req.json();

    console.log(`Admin chat handler action: ${action}`);

    switch (action) {
      case 'forward_to_admin':
        if (!userId || !message) {
          return new Response(
            JSON.stringify({ error: 'Missing userId or message' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get user's plan for priority
        const { data: userProfile } = await supabaseClient
          .from('profiles')
          .select('plan')
          .eq('user_id', userId)
          .single();

        const priority = userProfile?.plan === 'pro' ? 'high' : 
                        userProfile?.plan === 'vip' ? 'normal' : 'low';

        // Get or create chat session
        let chatSessionId;
        const { data: existingSession } = await supabaseClient
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('session_status', 'active')
          .single();

        if (existingSession) {
          chatSessionId = existingSession.id;
        } else {
          const { data: newSession, error: sessionError } = await supabaseClient
            .from('chat_sessions')
            .insert({
              user_id: userId,
              session_status: 'active',
              first_message_sent: true
            })
            .select()
            .single();

          if (sessionError) throw sessionError;
          chatSessionId = newSession.id;
        }

        // Add to admin queue
        const { error: queueError } = await supabaseClient
          .from('admin_chat_queue')
          .insert({
            user_id: userId,
            chat_session_id: chatSessionId,
            message: message,
            status: 'pending',
            priority: priority
          });

        if (queueError) throw queueError;

        console.log(`Forwarded message to admin queue for user ${userId}`);
        break;

      case 'respond_to_user':
        if (!queueItemId || !message || !adminId) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get queue item
        const { data: queueItem, error: queueFetchError } = await supabaseClient
          .from('admin_chat_queue')
          .select('*, chat_sessions(*)')
          .eq('id', queueItemId)
          .single();

        if (queueFetchError) throw queueFetchError;

        // Create or get support ticket
        let ticketId;
        const { data: existingTicket } = await supabaseClient
          .from('support_tickets')
          .select('id')
          .eq('user_id', queueItem.user_id)
          .eq('status', 'open')
          .single();

        if (existingTicket) {
          ticketId = existingTicket.id;
        } else {
          const { data: newTicket, error: ticketError } = await supabaseClient
            .from('support_tickets')
            .insert({
              user_id: queueItem.user_id,
              subject: 'Resposta do Suporte',
              description: queueItem.message,
              priority: queueItem.priority,
              status: 'open',
              assigned_to: adminId
            })
            .select()
            .single();

          if (ticketError) throw ticketError;
          ticketId = newTicket.id;
        }

        // Send admin response
        const { error: messageError } = await supabaseClient
          .from('support_messages')
          .insert({
            ticket_id: ticketId,
            sender_id: adminId,
            message: message,
            is_bot: false,
            is_internal: false
          });

        if (messageError) throw messageError;

        // Update queue item
        const { error: updateError } = await supabaseClient
          .from('admin_chat_queue')
          .update({
            status: 'responded',
            assigned_admin: adminId,
            responded_at: new Date().toISOString()
          })
          .eq('id', queueItemId);

        if (updateError) throw updateError;

        // Send notification to user
        await supabaseClient
          .from('notifications')
          .insert({
            title: 'Resposta do Suporte',
            message: 'Você recebeu uma nova resposta do suporte. Verifique o chat.',
            type: 'info',
            target_users: [queueItem.user_id],
            expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()
          });

        console.log(`Admin ${adminId} responded to queue item ${queueItemId}`);
        break;

      case 'close_chat':
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Missing userId' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Close chat session
        const { error: closeError } = await supabaseClient
          .from('chat_sessions')
          .update({ session_status: 'closed' })
          .eq('user_id', userId);

        if (closeError) throw closeError;

        // Close related tickets
        await supabaseClient
          .from('support_tickets')
          .update({ status: 'closed' })
          .eq('user_id', userId)
          .eq('status', 'open');

        console.log(`Closed chat for user ${userId}`);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    return new Response(
      JSON.stringify({ message: 'Action completed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in admin chat handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
