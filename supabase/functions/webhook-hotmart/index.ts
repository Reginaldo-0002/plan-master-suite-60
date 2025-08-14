import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔥 Hotmart webhook received')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get raw body and headers
    const rawBody = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    console.log('📦 Raw payload:', rawBody)
    console.log('📋 Headers:', headers)

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

    // Verificar assinatura Hotmart
    const hotmartSignature = headers['x-hotmart-hottok'] || headers['hottok']
    
    // Buscar endpoint configurado para Hotmart
    const { data: endpoints, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('provider', 'hotmart')
      .eq('active', true)
      .limit(1)

    if (endpointError || !endpoints || endpoints.length === 0) {
      console.error('❌ No active Hotmart endpoint found:', endpointError)
      return new Response(
        JSON.stringify({ error: 'No active endpoint configured' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const endpoint = endpoints[0]

    // Verificar assinatura (se configurada)
    if (endpoint.secret && hotmartSignature) {
      // Aqui você implementaria a verificação de assinatura do Hotmart
      // Por enquanto, apenas log
      console.log('🔐 Signature verification would happen here')
    }

    // Gerar chave de idempotência
    const idempotencyKey = `hotmart_${payload.data?.transaction || payload.id || Date.now()}_${payload.event || 'unknown'}`
    
    console.log('🔑 Idempotency key:', idempotencyKey)

    // Inserir evento (com idempotência)
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'hotmart',
        raw_headers: headers,
        raw_payload: payload,
        idempotency_key: idempotencyKey,
        verified: !!hotmartSignature,
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