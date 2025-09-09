import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  CreditCard,
  Globe,
  Webhook,
  BarChart3,
  Settings,
  TestTube,
  Facebook
} from 'lucide-react';
import { PlansManagement } from './PlansManagement';
import { WebhookEndpoints } from './WebhookEndpoints';
import { WebhookEvents } from './WebhookEvents';
import { OutboundWebhooks } from './OutboundWebhooks';
import { MetaTracking } from './MetaTracking';
import { TestLab } from './TestLab';
import { IntegrationsSettings } from './IntegrationsSettings';
import { useWebhookIntegration } from '@/hooks/useWebhookIntegration';
import { useAuth } from '@/hooks/useAuth';

interface IntegrationsDashboardProps {
  onSectionChange: (section: string) => void;
}

export function IntegrationsDashboard({ onSectionChange }: IntegrationsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  
  // Ativar monitoramento automático de webhooks
  useWebhookIntegration(user?.id);

  const stats = [
    {
      title: 'Webhooks Recebidos',
      value: '0',
      description: 'Últimas 24h',
      icon: Webhook,
      color: 'text-blue-600'
    },
    {
      title: 'Eventos Processados',
      value: '0',
      description: 'Taxa de sucesso: 100%',
      icon: Activity,
      color: 'text-green-600'
    },
    {
      title: 'Assinaturas Ativas',
      value: '0',
      description: 'Planos ativos',
      icon: CreditCard,
      color: 'text-purple-600'
    },
    {
      title: 'Endpoints Configurados',
      value: '0',
      description: 'Hotmart, Kiwify, Caktor',
      icon: Globe,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrações & Webhooks</h1>
        <p className="text-muted-foreground">
          Gerencie webhooks, planos, rastreamento e integrações de pagamento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Conexões
          </TabsTrigger>
          <TabsTrigger value="webhooks-in" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks In
          </TabsTrigger>
          <TabsTrigger value="webhooks-out" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Webhooks Out
          </TabsTrigger>
          <TabsTrigger value="meta-tracking" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Meta Pixel
          </TabsTrigger>
          <TabsTrigger value="test-lab" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Lab
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status dos Endpoints</CardTitle>
                <CardDescription>
                  Monitoramento em tempo real dos webhooks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hotmart</span>
                  <Badge variant="outline">Não configurado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Kiwify</span>
                  <Badge variant="outline">Não configurado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Caktor</span>
                  <Badge variant="outline">Não configurado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Genérico</span>
                  <Badge variant="outline">Não configurado</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimos Eventos</CardTitle>
                <CardDescription>
                  Eventos recebidos e processados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum evento recebido ainda
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <PlansManagement />
        </TabsContent>

        <TabsContent value="connections">
          <WebhookEndpoints />
        </TabsContent>

        <TabsContent value="webhooks-in">
          <WebhookEvents />
        </TabsContent>

        <TabsContent value="webhooks-out">
          <OutboundWebhooks />
        </TabsContent>

        <TabsContent value="meta-tracking">
          <MetaTracking />
        </TabsContent>

        <TabsContent value="test-lab">
          <TestLab />
        </TabsContent>
      </Tabs>
    </div>
  );
}