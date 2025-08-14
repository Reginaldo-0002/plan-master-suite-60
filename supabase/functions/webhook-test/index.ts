import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🧪 Webhook test function called')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { endpoint_id, test_type = 'connection' } = await req.json()

    if (!endpoint_id) {
      return new Response(
        JSON.stringify({ error: 'endpoint_id is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Buscar endpoint
    const { data: endpoint, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', endpoint_id)
      .single()

    if (endpointError || !endpoint) {
      console.error('❌ Endpoint not found:', endpointError)
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('📍 Testing endpoint:', endpoint.provider, endpoint.url)

    // Payloads de teste realistas para cada plataforma
    const testPayloads = {
      hotmart: {
        event: "PURCHASE_COMPLETE",
        version: "2.0.0",
        data: {
          product: {
            id: 123456,
            name: "Produto Teste Hotmart",
            ucode: "test-product-123"
          },
          purchase: {
            transaction: `HP${Date.now()}`,
            status: "COMPLETE",
            price: {
              value: 97.00,
              currency_value: "BRL"
            },
            buyer_email: "teste@hotmart.com",
            checkout_country: "BR"
          },
          buyer: {
            email: "teste@hotmart.com",
            name: "Usuário Teste"
          }
        }
      },
      kiwify: {
        Customer: { 
          email: "teste@kiwify.com",
          full_name: "Usuário Teste Kiwify"
        },
        Product: { 
          product_name: "Produto Teste Kiwify",
          product_id: "prod_123456"
        },
        CommissionAs: { value: 97.00 },
        order_status: "paid",
        order_id: `KW${Date.now()}`,
        created_at: new Date().toISOString()
      },
      caktor: {
        event_type: "purchase.completed",
        id: `caktor_${Date.now()}`,
        created_at: new Date().toISOString(),
        data: {
          customer_email: "teste@caktor.com",
          customer_name: "Usuário Teste Caktor",
          product_name: "Produto Teste Caktor",
          product_id: "caktor_prod_123",
          amount: 97.00,
          currency: "BRL",
          order_id: `CK${Date.now()}`
        }
      },
      generic: {
        event: "purchase.completed",
        id: `generic_${Date.now()}`,
        timestamp: new Date().toISOString(),
        data: {
          customer_email: "teste@generic.com",
          customer_name: "Usuário Teste Generic",
          product_name: "Produto Teste Generic",
          amount: 97.00,
          currency: "BRL",
          order_id: `GN${Date.now()}`
        }
      }
    }

    const payload = testPayloads[endpoint.provider as keyof typeof testPayloads] || testPayloads.generic

    // Headers para o teste
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Webhook-Test/1.0',
      'X-Test-Event': 'true'
    }

    // Adicionar assinatura se houver secret
    if (endpoint.secret) {
      if (endpoint.provider === 'hotmart') {
        headers['x-hotmart-hottok'] = endpoint.secret
      } else if (endpoint.provider === 'kiwify') {
        // Kiwify usa HMAC SHA256
        const crypto = await import('https://deno.land/std@0.168.0/crypto/mod.ts')
        const key = await crypto.crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(endpoint.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signature = await crypto.crypto.subtle.sign(
          'HMAC',
          key,
          new TextEncoder().encode(JSON.stringify(payload))
        )
        headers['x-kiwify-signature'] = btoa(String.fromCharCode(...new Uint8Array(signature)))
      } else {
        headers['x-webhook-secret'] = endpoint.secret
      }
    }

    console.log('📦 Sending test payload:', JSON.stringify(payload))

    let testResult: any = {}

    if (test_type === 'connection') {
      // Teste de conectividade simples
      try {
        const response = await fetch(endpoint.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Webhook-Test/1.0' }
        })
        
        testResult = {
          connection: true,
          status: response.status,
          headers: Object.fromEntries(response.headers),
          reachable: response.status < 500
        }
      } catch (error) {
        testResult = {
          connection: false,
          error: error.message,
          reachable: false
        }
      }
    } else {
      // Teste completo de webhook
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })

        const responseText = await response.text()
        
        testResult = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          response_headers: Object.fromEntries(response.headers),
          response_body: responseText,
          sent_payload: payload,
          sent_headers: headers
        }

        // Registrar resultado no banco
        await supabase.from('webhook_endpoints').update({
          last_healthcheck_at: new Date().toISOString()
        }).eq('id', endpoint_id)

      } catch (error) {
        console.error('❌ Test failed:', error)
        testResult = {
          success: false,
          error: error.message,
          sent_payload: payload,
          sent_headers: headers
        }
      }
    }

    console.log('✅ Test completed:', testResult)

    return new Response(
      JSON.stringify({
        success: true,
        endpoint: {
          id: endpoint.id,
          provider: endpoint.provider,
          url: endpoint.url
        },
        test_result: testResult,
        tested_at: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Test function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})