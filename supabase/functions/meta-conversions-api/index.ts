import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📊 Meta Conversions API called')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const body = await req.json()
    const {
      event_name,
      event_id,
      user_email,
      value,
      currency = 'BRL',
      external_order_id,
      user_id
    } = body

    console.log('📦 Event data:', { event_name, event_id, user_email, value, currency })

    // Validar dados obrigatórios
    if (!event_name || !event_id) {
      return new Response(
        JSON.stringify({ error: 'event_name and event_id are required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Buscar configurações do Meta
    const { data: metaConfig, error: configError } = await supabase
      .from('tracking_meta')
      .select('*')
      .eq('enable_server', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (configError || !metaConfig) {
      console.error('❌ No Meta tracking configuration found:', configError)
      return new Response(
        JSON.stringify({ error: 'Meta tracking not configured' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const { pixel_id, access_token, test_event_code } = metaConfig

    if (!pixel_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Pixel ID or Access Token not configured' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Preparar dados para Meta Conversions API
    const eventData = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          action_source: 'website',
          user_data: {
            em: user_email ? await hashSHA256(user_email.toLowerCase().trim()) : undefined,
          },
          custom_data: {
            value: value ? parseFloat(value.toString()) : undefined,
            currency,
            order_id: external_order_id
          }
        }
      ],
      test_event_code: test_event_code || undefined
    }

    // Remover campos undefined
    Object.keys(eventData.data[0].user_data).forEach(key => {
      if (eventData.data[0].user_data[key] === undefined) {
        delete eventData.data[0].user_data[key]
      }
    })
    
    Object.keys(eventData.data[0].custom_data).forEach(key => {
      if (eventData.data[0].custom_data[key] === undefined) {
        delete eventData.data[0].custom_data[key]
      }
    })

    console.log('📤 Sending to Meta:', JSON.stringify(eventData, null, 2))

    // Enviar para Meta Conversions API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pixel_id}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(eventData)
      }
    )

    const metaResult = await metaResponse.json()
    console.log('📨 Meta response:', metaResult)

    // Salvar evento de tracking
    const { error: trackingError } = await supabase
      .from('tracking_events')
      .insert({
        event_name,
        event_id,
        source: 'server',
        fb_response: metaResult,
        success: metaResponse.ok,
        error_message: metaResponse.ok ? null : JSON.stringify(metaResult),
        user_id: user_id || null
      })

    if (trackingError) {
      console.error('❌ Error saving tracking event:', trackingError)
    }

    if (!metaResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Meta API error', 
          details: metaResult,
          facebook_response: metaResult
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id,
        facebook_response: metaResult
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Meta Conversions API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})

// Função para hash SHA256
async function hashSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}