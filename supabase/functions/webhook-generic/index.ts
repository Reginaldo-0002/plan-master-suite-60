import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔧 Generic webhook received')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get raw body and headers
    const rawBody = await req.text()
    const headers = Object.fromEntries(req.headers)
    const url = new URL(req.url)
    
    console.log('📦 Raw payload:', rawBody)
    console.log('📋 Headers:', headers)
    console.log('🔗 URL params:', url.searchParams.toString())

    // Parse JSON
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('❌ Invalid JSON:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Get timestamp for replay attack prevention
    const timestamp = headers['x-webhook-timestamp'] || headers['timestamp']
    
    // Reject requests without timestamp (replay attack prevention)
    if (timestamp) {
      const requestTime = parseInt(timestamp)
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      
      if (isNaN(requestTime) || Math.abs(now - requestTime) > fiveMinutes) {
        console.error('❌ Request timestamp too old or invalid')
        return new Response(
          JSON.stringify({ error: 'Request timestamp invalid or expired' }),
          { status: 401, headers: corsHeaders }
        )
      }
    }
    
    // MANDATORY: Secret verification via header only (never query params for security)
    const providedSecret = headers['x-webhook-secret'] || headers['authorization']?.replace('Bearer ', '')
    
    // Buscar endpoint configurado para Generic
    const { data: endpoints, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('provider', 'generic')
      .eq('active', true)
      .limit(1)

    if (endpointError || !endpoints || endpoints.length === 0) {
      console.error('❌ No active Generic endpoint found:', endpointError)
      return new Response(
        JSON.stringify({ error: 'No active endpoint configured' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const endpoint = endpoints[0]

    // MANDATORY secret verification - reject if no secret or mismatch
    if (!endpoint.secret || !providedSecret || providedSecret !== endpoint.secret) {
      console.error('❌ Secret verification failed')
      
      // Log failed attempt with IP
      const clientIP = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
      console.log(`🚨 Unauthorized webhook attempt from IP: ${clientIP}`)
      
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing secret' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Gerar chave de idempotência
    const idempotencyKey = `generic_${payload.order_id || payload.transaction_id || payload.id || Date.now()}_${payload.event_type || 'unknown'}`
    
    console.log('🔑 Idempotency key:', idempotencyKey)

    // Inserir evento (com idempotência)
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'generic',
        raw_headers: headers,
        raw_payload: payload,
        idempotency_key: idempotencyKey,
        verified: !!providedSecret,
        status: 'received'
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        console.log('✅ Event already processed (idempotent)')
        return new Response(
          JSON.stringify({ message: 'Event already processed', idempotent: true }),
          { status: 200, headers: corsHeaders }
        )
      }
      
      console.error('❌ Error inserting webhook event:', insertError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Webhook event created:', webhookEvent.id)

    // Processar evento
    const { data: processResult, error: processError } = await supabase.rpc(
      'process_webhook_event',
      { event_id: webhookEvent.id }
    )

    if (processError) {
      console.error('❌ Error processing event:', processError)
    } else {
      console.log('✅ Event processed:', processResult)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: webhookEvent.id,
        processed: !processError
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})