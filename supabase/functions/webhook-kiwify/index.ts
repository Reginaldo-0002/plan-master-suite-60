import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🥝 Kiwify webhook received')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get raw body (as received) and headers
    const contentType = req.headers.get('content-type') || ''
    const rawBodyString = await req.text()
    const headers = Object.fromEntries(req.headers)

    console.log('📦 Raw body (string):', rawBodyString)
    console.log('📋 Headers:', headers)

    // Parse payload supporting JSON and x-www-form-urlencoded
    let payload: any
    try {
      if (contentType.includes('application/json')) {
        payload = JSON.parse(rawBodyString)
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBodyString)
        const inner = params.get('payload') || params.get('data') || params.get('json')
        if (inner) {
          try {
            payload = JSON.parse(inner)
          } catch (_) {
            payload = Object.fromEntries(params.entries())
          }
        } else {
          payload = Object.fromEntries(params.entries())
        }
      } else {
        // Best-effort fallback
        try {
          payload = JSON.parse(rawBodyString)
        } catch (_) {
          const params = new URLSearchParams(rawBodyString)
          if ([...params.keys()].length > 0) {
            const inner2 = params.get('payload') || params.get('data')
            try {
              payload = inner2 ? JSON.parse(inner2) : Object.fromEntries(params.entries())
            } catch {
              payload = Object.fromEntries(params.entries())
            }
          } else {
            throw new Error('Unsupported payload format')
          }
        }
      }
    } catch (e) {
      console.error('❌ Invalid or unsupported payload:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid or unsupported payload' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('🧩 Parsed payload object:', payload)

    // Buscar endpoint configurado para Kiwify
    const { data: endpoints, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('provider', 'kiwify')
      .eq('active', true)
      .limit(1)

    if (endpointError || !endpoints || endpoints.length === 0) {
      console.error('❌ No active Kiwify endpoint found:', endpointError)
      return new Response(
        JSON.stringify({ error: 'No active endpoint configured' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const endpoint = endpoints[0]

    // Determinar se deve verificar assinatura
    let isVerified = false
    const kiwifySignature = headers['x-kiwify-signature'] || headers['signature']

    // Se endpoint exige assinatura E há assinatura, verifica
    if (endpoint.require_signature && endpoint.secret && kiwifySignature) {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(endpoint.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )
      
      const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBodyString))
      const expectedHex = Array.from(new Uint8Array(mac))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      const provided = String(kiwifySignature).trim()
      const matches = provided === expectedHex || provided === `sha256=${expectedHex}`
      if (!matches) {
        console.error('❌ Invalid signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: corsHeaders }
        )
      }
      
      isVerified = true
      console.log('✅ Signature verified')
    } else if (!endpoint.require_signature) {
      // Se não exige assinatura, marca como verificado por padrão
      isVerified = true
      console.log('✅ Verification not required - marking as verified')
    } else {
      console.log('⚠️ Verification required but signature missing')
    }

    // Gerar chave de idempotência usando order_id do payload da Kiwify
    const orderId = payload.order_id || payload.order?.id || payload.id || Date.now()
    const eventType = payload.webhook_event_type || payload.event_type || 'unknown'
    const idempotencyKey = `kiwify_${orderId}_${eventType}`
    
    console.log('🔑 Idempotency key:', idempotencyKey)

    // Inserir evento (com idempotência)
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'kiwify',
        raw_headers: headers,
        raw_payload: payload,
        idempotency_key: idempotencyKey,
        verified: isVerified,
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