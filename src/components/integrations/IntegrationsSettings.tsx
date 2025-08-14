import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Settings, Webhook, MessageSquare, TestTube } from 'lucide-react';
import { PlansManagement } from './PlansManagement';
import { WebhookEndpoints } from './WebhookEndpoints';
import { WebhookEvents } from './WebhookEvents';
import { OutboundWebhooks } from './OutboundWebhooks';
import { MetaTracking } from './MetaTracking';
import { TestLab } from './TestLab';

interface IntegrationsSettingsProps {
  onSectionChange: (section: string) => void;
}

export function IntegrationsSettings({ onSectionChange }: IntegrationsSettingsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onSectionChange(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrações & Webhooks</h1>
        <p className="text-muted-foreground">
          Configure conexões com plataformas externas, webhooks e automações
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Saída
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Meta/Testes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Status Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
                <Webhook className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">
                  +2 desde ontem
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos Processados</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">
                  +180 nas últimas 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98.5%</div>
                <p className="text-xs text-muted-foreground">
                  +0.2% desde ontem
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plataformas Conectadas</CardTitle>
                <CardDescription>
                  Status das integrações com plataformas de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>Hotmart</span>
                  </div>
                  <Badge variant="default">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Kiwify</span>
                  </div>
                  <Badge variant="default">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Caktor</span>
                  </div>
                  <Badge variant="secondary">Não conectado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span>Genérico</span>
                  </div>
                  <Badge variant="default">Conectado</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>
                  Acesso rápido às funcionalidades principais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleTabChange('endpoints')}
                >
                  <Webhook className="h-4 w-4 mr-2" />
                  Configurar Webhook
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleTabChange('plans')}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Gerenciar Planos
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleTabChange('events')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ver Eventos
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleTabChange('tracking')}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar Integrações
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>Saúde do Sistema</CardTitle>
              <CardDescription>
                Monitor de performance e disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processamento de Webhooks</span>
                  <Badge variant="default">Operacional</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Banco de Dados</span>
                  <Badge variant="default">Operacional</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Meta Conversions API</span>
                  <Badge variant="default">Operacional</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Webhooks de Saída</span>
                  <Badge variant="default">Operacional</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <PlansManagement />
        </TabsContent>

        <TabsContent value="endpoints">
          <WebhookEndpoints />
        </TabsContent>

        <TabsContent value="events">
          <WebhookEvents />
        </TabsContent>

        <TabsContent value="outbound">
          <OutboundWebhooks />
        </TabsContent>

        <TabsContent value="tracking">
          <div className="space-y-6">
            <MetaTracking />
            <TestLab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}