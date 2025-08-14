import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Settings, Webhook, MessageSquare, TestTube } from 'lucide-react';
import { IntegrationsStatsCards } from './IntegrationsStatsCards';
import { PlatformStatusCard } from './PlatformStatusCard';
import { SystemHealthCard } from './SystemHealthCard';
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
    // Only call onSectionChange for non-overview tabs to prevent navigation conflict
    if (value !== 'overview') {
      onSectionChange(`integrations-${value}`);
    }
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
            {/* Real Status Cards - Connected to Database */}
            <IntegrationsStatsCards />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Platform Status - Connected to Database */}
            <PlatformStatusCard />

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

          {/* Real System Health - Connected to Database */}
          <SystemHealthCard />
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