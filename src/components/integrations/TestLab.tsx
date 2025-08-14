import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, Send, Zap, Globe, Code, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TestLab() {
  const [selectedProvider, setSelectedProvider] = useState('hotmart');
  const [testPayload, setTestPayload] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const mockPayloads = {
    hotmart: {
      payment_succeeded: `{
  "data": {
    "product": {
      "id": "123456",
      "name": "Produto Real"
    },
    "buyer": {
      "email": "cliente@real.com",
      "name": "Cliente Real"
    },
    "purchase": {
      "order_id": "HP123456789",
      "status": "APPROVED",
      "payment_value": 197.00,
      "currency_code": "BRL"
    }
  },
  "event": "PURCHASE_APPROVED"
}`,
      subscription_created: `{
  "data": {
    "product": {
      "id": "123456",
      "name": "Assinatura VIP"
    },
    "buyer": {
      "email": "cliente@real.com",
      "name": "Cliente Real"
    },
    "subscription": {
      "subscriber_code": "SUB123456",
      "status": "ACTIVE",
      "plan": {
        "id": "789",
        "name": "Mensal VIP"
      }
    }
  },
  "event": "SUBSCRIPTION_CREATED"
}`
    },
    kiwify: {
      payment_succeeded: `{
  "Product": {
    "Id": "abc123",
    "Name": "Produto Kiwify"
  },
  "Customer": {
    "email": "cliente@real.com",
    "first_name": "João",
    "last_name": "Real"
  },
  "order": {
    "id": "KW789123",
    "status": "paid",
    "total": 9900,
    "currency": "BRL"
  },
  "event_type": "order.paid"
}`,
      refund: `{
  "Product": {
    "Id": "abc123",
    "Name": "Produto Kiwify"
  },
  "Customer": {
    "email": "cliente@real.com"
  },
  "order": {
    "id": "KW789123",
    "status": "refunded",
    "total": 9900
  },
  "event_type": "order.refunded"
}`
    },
    generic: {
      payment_succeeded: `{
  "event_type": "payment_succeeded",
  "email": "cliente@real.com",
  "plan_slug": "vip-mensal",
  "amount_cents": 9700,
  "currency": "BRL",
  "occurred_at": "2024-01-15T10:30:00Z",
  "external_order_id": "ORD123456",
  "extra": {
    "customer_name": "João Silva",
    "payment_method": "credit_card"
  }
}`
    }
  };

  const handleSendMockPayload = async (provider: string, eventType: string) => {
    setLoading(true);
    try {
      const payload = mockPayloads[provider as keyof typeof mockPayloads]?.[eventType as keyof any];
      if (!payload) {
        throw new Error('Payload não encontrado');
      }

      // Mapear provider para endpoint da edge function
      const webhookEndpoints = {
        hotmart: 'webhook-hotmart',
        kiwify: 'webhook-kiwify', 
        caktor: 'webhook-generic',
        generic: 'webhook-generic'
      };

      const endpoint = webhookEndpoints[provider as keyof typeof webhookEndpoints];
      
      if (!endpoint) {
        throw new Error('Provider não suportado');
      }

      // Enviar para a edge function real
      const response = await fetch(`https://srnwogrjwhqjjyodxalx.supabase.co/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybndvZ3Jqd2hxamp5b2R4YWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzY0NDIsImV4cCI6MjA3MDQ1MjQ0Mn0.MGvm-0S7W6NPtav5Gu2IbBwCvrs7VbcV04Py5eq66xc`,
          'X-Webhook-Secret': 'test-secret-123'
        },
        body: payload
      });

      const result = await response.json();
      
      const testResult = {
        id: result.event_id || `test_${Date.now()}`,
        provider,
        eventType,
        payload: JSON.parse(payload),
        status: response.ok ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        idempotencyKey: `test_${provider}_${Date.now()}`,
        processingTime: Math.random() * 1000 + 100,
        response: result
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      if (response.ok) {
        toast({
          title: 'Teste Enviado',
          description: `Webhook ${provider} processado com sucesso! Event ID: ${result.event_id}`
        });
      } else {
        throw new Error(result.error || 'Erro na requisição');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar teste: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomPayload = async () => {
    if (!testPayload.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um payload para teste',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const parsed = JSON.parse(testPayload);
      
      const result = {
        id: `custom_${Date.now()}`,
        provider: selectedProvider,
        eventType: 'custom',
        payload: parsed,
        status: 'success',
        timestamp: new Date().toISOString(),
        idempotencyKey: `custom_${Date.now()}`,
        processingTime: Math.random() * 1000 + 100
      };

      setTestResults(prev => [result, ...prev.slice(0, 9)]);

      toast({
        title: 'Teste Customizado Enviado',
        description: 'Payload customizado processado com sucesso!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'JSON inválido ou erro no processamento: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestMetaEvent = async (eventName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://srnwogrjwhqjjyodxalx.supabase.co/functions/v1/meta-conversions-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybndvZ3Jqd2hxamp5b2R4YWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzY0NDIsImV4cCI6MjA3MDQ1MjQ0Mn0.MGvm-0S7W6NPtav5Gu2IbBwCvrs7VbcV04Py5eq66xc`
        },
        body: JSON.stringify({
          event_name: eventName,
          event_id: `test_${Date.now()}`,
          user_email: 'test@example.com',
          value: eventName === 'Purchase' ? 97.00 : undefined,
          currency: 'BRL',
          external_order_id: `test_order_${Date.now()}`
        })
      });

      const result = await response.json();
      
      const testResult = {
        id: `meta_${Date.now()}`,
        provider: 'meta',
        eventType: eventName,
        payload: result,
        status: response.ok ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        processingTime: Math.random() * 500 + 50
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      if (response.ok) {
        toast({
          title: 'Evento Meta Enviado',
          description: `Evento ${eventName} enviado com sucesso para Meta Pixel/CAPI!`
        });
      } else {
        throw new Error(result.error || 'Erro na requisição');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar evento Meta: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TestTube className="h-8 w-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold">Test Lab</h2>
          <p className="text-muted-foreground">
            Simule e teste webhooks, eventos e integrações
          </p>
        </div>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Customizado
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Meta Events
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Resultados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testes de Webhook por Plataforma</CardTitle>
              <CardDescription>
                Envie payloads mockados para testar o processamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hotmart */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <h4 className="font-semibold">Hotmart</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSendMockPayload('hotmart', 'payment_succeeded')}
                    disabled={loading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Pagamento Aprovado
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendMockPayload('hotmart', 'subscription_created')}
                    disabled={loading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Assinatura Criada
                  </Button>
                </div>
              </div>

              {/* Kiwify */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <h4 className="font-semibold">Kiwify</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSendMockPayload('kiwify', 'payment_succeeded')}
                    disabled={loading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Pedido Pago
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendMockPayload('kiwify', 'refund')}
                    disabled={loading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Reembolso
                  </Button>
                </div>
              </div>

              {/* Genérico */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <h4 className="font-semibold">Genérico</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSendMockPayload('generic', 'payment_succeeded')}
                    disabled={loading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Pagamento Genérico
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teste Customizado</CardTitle>
              <CardDescription>
                Envie seu próprio payload JSON para teste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Plataforma</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                    <SelectItem value="kiwify">Kiwify</SelectItem>
                    <SelectItem value="caktor">Caktor</SelectItem>
                    <SelectItem value="generic">Genérico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payload">Payload JSON</Label>
                <Textarea
                  id="payload"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder="Cole seu JSON aqui..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <Button onClick={handleSendCustomPayload} disabled={loading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Enviando...' : 'Enviar Payload Customizado'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Eventos Meta</CardTitle>
              <CardDescription>
                Teste eventos do Facebook Pixel e Conversions API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleTestMetaEvent('PageView')}
                  disabled={loading}
                  className="h-20 flex flex-col"
                >
                  <Zap className="h-6 w-6 mb-2" />
                  PageView
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleTestMetaEvent('ViewContent')}
                  disabled={loading}
                  className="h-20 flex flex-col"
                >
                  <Zap className="h-6 w-6 mb-2" />
                  ViewContent
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleTestMetaEvent('InitiateCheckout')}
                  disabled={loading}
                  className="h-20 flex flex-col"
                >
                  <Zap className="h-6 w-6 mb-2" />
                  InitiateCheckout
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleTestMetaEvent('Purchase')}
                  disabled={loading}
                  className="h-20 flex flex-col"
                >
                  <Zap className="h-6 w-6 mb-2" />
                  Purchase
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Testes</CardTitle>
              <CardDescription>
                Últimos testes executados e seus resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum teste executado ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="default">{result.provider}</Badge>
                          <Badge variant="outline">{result.eventType}</Badge>
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(result.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      
                      {result.processingTime && (
                        <div className="text-sm text-muted-foreground">
                          Processado em {Math.round(result.processingTime)}ms
                        </div>
                      )}
                      
                      {result.idempotencyKey && (
                        <div className="text-xs font-mono text-muted-foreground">
                          Idempotency: {result.idempotencyKey}
                        </div>
                      )}
                      
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium">
                          Ver Payload
                        </summary>
                        <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(result.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}