import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PlatformInstructionsProps {
  provider: 'hotmart' | 'kiwify' | 'caktor' | 'generic';
  webhookUrl: string;
  secret?: string;
}

export function PlatformInstructions({ provider, webhookUrl, secret }: PlatformInstructionsProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência`
    });
  };

  const instructions = {
    hotmart: {
      name: 'Hotmart',
      color: 'bg-orange-500',
      steps: [
        'Acesse o painel do Hotmart Producer',
        'Vá em "Configurações" > "Webhooks"',
        'Clique em "Adicionar Webhook"',
        'Cole a URL gerada no campo "URL do Webhook"',
        'Cole o token no campo "Token de Segurança"',
        'Selecione os eventos que deseja receber',
        'Salve as configurações'
      ],
      events: [
        'PURCHASE_COMPLETE - Compra finalizada',
        'PURCHASE_REFUNDED - Compra reembolsada',
        'PURCHASE_CHARGEBACK - Chargeback',
        'SUBSCRIPTION_CANCELLATION - Cancelamento de assinatura'
      ],
      docs: 'https://developers.hotmart.com/docs/pt-BR/v1/webhooks/intro/',
      testPayload: {
        event: "PURCHASE_COMPLETE",
        data: {
          product: { id: 123456 },
          purchase: { 
            price: { value: 97.00, currency_value: "BRL" },
            transaction: "HP123456789" 
          }
        }
      }
    },
    kiwify: {
      name: 'Kiwify',
      color: 'bg-green-500',
      steps: [
        'Acesse o painel da Kiwify',
        'Vá em "Configurações" > "Integrações"',
        'Encontre a seção "Webhooks"',
        'Cole a URL gerada no campo "URL do Webhook"',
        'Cole o secret no campo "Chave Secreta"',
        'Ative os eventos desejados',
        'Clique em "Salvar"'
      ],
      events: [
        'order.approved - Pedido aprovado',
        'order.refused - Pedido recusado',
        'order.refunded - Pedido reembolsado',
        'subscription.charged - Cobrança de assinatura'
      ],
      docs: 'https://dev.kiwify.com.br/webhooks',
      testPayload: {
        Customer: { email: "teste@kiwify.com" },
        Product: { product_name: "Produto Teste" },
        order_status: "paid"
      }
    },
    caktor: {
      name: 'Caktor',
      color: 'bg-blue-500',
      steps: [
        'Acesse o painel da Caktor',
        'Vá em "Configurações" > "Webhooks"',
        'Clique em "Novo Webhook"',
        'Cole a URL gerada',
        'Defina o secret para segurança',
        'Selecione os eventos',
        'Ative o webhook'
      ],
      events: [
        'purchase.completed - Compra completada',
        'purchase.refunded - Compra reembolsada',
        'subscription.created - Assinatura criada',
        'subscription.canceled - Assinatura cancelada'
      ],
      docs: 'https://docs.caktor.com/webhooks',
      testPayload: {
        event_type: "purchase.completed",
        data: { customer_email: "teste@caktor.com", amount: 97.00 }
      }
    },
    generic: {
      name: 'Webhook Genérico',
      color: 'bg-gray-500',
      steps: [
        'Use esta opção para outras plataformas',
        'Configure a URL gerada na sua plataforma',
        'Use o secret para validação',
        'Certifique-se que os dados sejam enviados em JSON',
        'Teste a conexão após configurar'
      ],
      events: [
        'Eventos customizados baseados na plataforma',
        'Estrutura de dados flexível',
        'Suporte a qualquer formato JSON'
      ],
      docs: null,
      testPayload: {
        event: "test_webhook",
        data: { message: "Webhook genérico funcionando" }
      }
    }
  };

  const config = instructions[provider];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${config.color}`} />
            <CardTitle>Configuração do {config.name}</CardTitle>
          </div>
          <CardDescription>
            Siga as instruções abaixo para configurar o webhook na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL do Webhook */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL do Webhook</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-muted font-mono text-sm"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(webhookUrl, 'URL do webhook')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Secret/Token */}
          {secret && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Token/Secret</label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={secret}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-muted font-mono text-sm"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(secret, 'Secret')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Passos de Configuração */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Passos para Configuração</h4>
            <ol className="space-y-1 text-sm text-muted-foreground">
              {config.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <Badge variant="outline" className="min-w-6 h-6 text-xs">
                    {index + 1}
                  </Badge>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Eventos Suportados */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Eventos Suportados</h4>
            <div className="space-y-1">
              {config.events.map((event, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {event}
                </div>
              ))}
            </div>
          </div>

          {/* Documentação */}
          {config.docs && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Consulte a documentação oficial para mais detalhes</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(config.docs, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Documentação
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Payload de Exemplo */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Exemplo de Payload</h4>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
              {JSON.stringify(config.testPayload, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}