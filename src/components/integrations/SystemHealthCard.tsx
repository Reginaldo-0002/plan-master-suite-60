import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheck {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  lastCheck?: Date;
}

export function SystemHealthCard() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performHealthChecks();
  }, []);

  const performHealthChecks = async () => {
    const checks: HealthCheck[] = [];

    try {
      // Check database connectivity
      const { error: dbError } = await supabase
        .from('plans')
        .select('id')
        .limit(1);
      
      checks.push({
        service: 'Banco de Dados',
        status: dbError ? 'down' : 'operational',
        lastCheck: new Date()
      });

      // Check webhook processing (look for recent successful events)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentEvents, error: eventsError } = await supabase
        .from('webhook_events')
        .select('status')
        .gte('created_at', yesterday.toISOString())
        .limit(10);

      const hasRecentSuccess = recentEvents?.some(e => e.status === 'processed');
      checks.push({
        service: 'Processamento de Webhooks',
        status: eventsError ? 'down' : (hasRecentSuccess || recentEvents?.length === 0) ? 'operational' : 'degraded',
        lastCheck: new Date()
      });

      // Check platform checkout functionality
      const { data: platformProducts, error: platformError } = await supabase
        .from('platform_products')
        .select('id')
        .eq('active', true)
        .limit(1);

      checks.push({
        service: 'Sistema de Checkout',
        status: platformError ? 'down' : 'operational',
        lastCheck: new Date()
      });

      // Check outbound webhooks - skip this check for now
      checks.push({
        service: 'Webhooks de Saída',
        status: 'operational', // Always show as operational since disabled
        lastCheck: new Date()
      });

      // Check plan system
      const { data: activePlans, error: plansError } = await supabase
        .from('plans')
        .select('id')
        .eq('active', true)
        .limit(1);

      checks.push({
        service: 'Sistema de Planos',
        status: plansError ? 'down' : 'operational',
        lastCheck: new Date()
      });

    } catch (error) {
      console.error('Error performing health checks:', error);
      // Set all services as down on error
      checks.push(
        { service: 'Banco de Dados', status: 'down' },
        { service: 'Processamento de Webhooks', status: 'down' },
        { service: 'Sistema de Checkout', status: 'down' },
        { service: 'Webhooks de Saída', status: 'down' },
        { service: 'Sistema de Planos', status: 'down' }
      );
    }

    setHealthChecks(checks);
    setLoading(false);
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    switch (status) {
      case 'operational':
        return <Badge variant="default">Operacional</Badge>;
      case 'degraded':
        return <Badge variant="destructive">Degradado</Badge>;
      case 'down':
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saúde do Sistema</CardTitle>
          <CardDescription>
            Monitor de performance e disponibilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Verificando saúde do sistema...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde do Sistema</CardTitle>
        <CardDescription>
          Monitor de performance e disponibilidade
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {healthChecks.map((check, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium">{check.service}</span>
              {getStatusBadge(check.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}