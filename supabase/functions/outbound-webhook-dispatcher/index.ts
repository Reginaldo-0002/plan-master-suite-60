import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Outbound webhook dispatcher called')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar eventos pendentes no event_bus
    const { data: pendingEvents, error: eventsError } = await supabase
      .from('event_bus')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (eventsError) {
      console.error('❌ Error fetching pending events:', eventsError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log(`📊 Found ${pendingEvents?.length || 0} pending events`)

    if (!pendingEvents || pendingEvents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending events', processed: 0 }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Buscar assinantes ativos
    const { data: subscriptions, error: subsError } = await supabase
      .from('outbound_subscriptions')
      .select('*')
      .eq('active', true)

    if (subsError || !subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No active outbound subscriptions')
      return new Response(
        JSON.stringify({ message: 'No active subscriptions', processed: 0 }),
        { status: 200, headers: corsHeaders }
      )
    }

    console.log(`📡 Found ${subscriptions.length} active subscriptions`)

    let totalProcessed = 0
    let totalDeliveries = 0

    // Processar cada evento
    for (const event of pendingEvents) {
      console.log(`📤 Processing event ${event.id}`)

      // Enviar para cada assinante
      for (const subscription of subscriptions) {
        console.log(`🎯 Sending to ${subscription.target_url}`)

        try {
          // Preparar payload
          const payload = {
            event_id: event.id,
            event_type: event.type,
            user_id: event.user_id,
            subscription_id: event.subscription_id,
            data: event.data,
            timestamp: event.created_at
          }

          // Gerar assinatura HMAC se secret configurado
          let signature = null
          if (subscription.secret) {
            const encoder = new TextEncoder()
            const key = await crypto.subtle.importKey(
              'raw',
              encoder.encode(subscription.secret),
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            )
            
            const signatureBuffer = await crypto.subtle.sign(
              'HMAC', 
              key, 
              encoder.encode(JSON.stringify(payload))
            )
            
            signature = Array.from(new Uint8Array(signatureBuffer))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
          }

          // Enviar webhook
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Integrations-Webhook/1.0'
          }

          if (signature) {
            headers['X-Webhook-Signature'] = `sha256=${signature}`
          }

          const response = await fetch(subscription.target_url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000) // 30s timeout
          })

          const responseText = await response.text().catch(() => '')

          // Registrar entrega
          const { error: deliveryError } = await supabase
            .from('outbound_deliveries')
            .insert({
              event_id: event.id,
              target_id: subscription.id,
              attempt: 1,
              status: response.ok ? 'delivered' : 'failed',
              response_code: response.status,
              response_body: responseText.substring(0, 1000), // Limitar tamanho
              delivered_at: response.ok ? new Date().toISOString() : null,
              next_retry_at: response.ok ? null : new Date(Date.now() + 5 * 60 * 1000).toISOString() // Retry em 5 min
            })

          if (deliveryError) {
            console.error(`❌ Error recording delivery for ${subscription.target_url}:`, deliveryError)
          }

          // Atualizar contadores da subscription
          if (response.ok) {
            await supabase
              .from('outbound_subscriptions')
              .update({
                last_delivery_at: new Date().toISOString(),
                failures_count: 0
              })
              .eq('id', subscription.id)
            
            console.log(`✅ Successfully delivered to ${subscription.target_url}`)
          } else {
            await supabase
              .from('outbound_subscriptions')
              .update({
                failures_count: (subscription.failures_count || 0) + 1
              })
              .eq('id', subscription.id)
            
            console.error(`❌ Failed to deliver to ${subscription.target_url}: ${response.status}`)
          }

          totalDeliveries++

        } catch (error) {
          console.error(`❌ Error sending to ${subscription.target_url}:`, error)

          // Registrar falha
          await supabase
            .from('outbound_deliveries')
            .insert({
              event_id: event.id,
              target_id: subscription.id,
              attempt: 1,
              status: 'failed',
              response_code: 0,
              response_body: error.message,
              next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
            })

          // Incrementar contador de falhas
          await supabase
            .from('outbound_subscriptions')
            .update({
              failures_count: (subscription.failures_count || 0) + 1
            })
            .eq('id', subscription.id)

          totalDeliveries++
        }
      }

      // Marcar evento como dispatched
      await supabase
        .from('event_bus')
        .update({ 
          status: 'dispatched',
          dispatched_at: new Date().toISOString()
        })
        .eq('id', event.id)

      totalProcessed++
    }

    console.log(`✅ Processed ${totalProcessed} events with ${totalDeliveries} total deliveries`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_events: totalProcessed,
        total_deliveries: totalDeliveries
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Outbound dispatcher error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})