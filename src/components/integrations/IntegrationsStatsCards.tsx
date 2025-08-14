import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Webhook, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface IntegrationsStats {
  activeConnections: number;
  processedEvents: number;
  successRate: number;
  eventsLast24h: number;
}

export function IntegrationsStatsCards() {
  const [stats, setStats] = useState<IntegrationsStats>({
    activeConnections: 0,
    processedEvents: 0,
    successRate: 0,
    eventsLast24h: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch active webhook endpoints
      const { data: endpoints } = await supabase
        .from('webhook_endpoints')
        .select('id')
        .eq('active', true);

      // Fetch webhook events
      const { data: events } = await supabase
        .from('webhook_events')
        .select('id, status, created_at');

      // Fetch events from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentEvents } = await supabase
        .from('webhook_events')
        .select('id, status')
        .gte('created_at', yesterday.toISOString());

      const totalEvents = events?.length || 0;
      const successfulEvents = events?.filter(e => e.status === 'processed')?.length || 0;
      const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;

      setStats({
        activeConnections: endpoints?.length || 0,
        processedEvents: totalEvents,
        successRate: Math.round(successRate * 10) / 10,
        eventsLast24h: recentEvents?.length || 0
      });
    } catch (error) {
      console.error('Error fetching integration stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">...</div>
            <p className="text-xs text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Processados</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">...</div>
            <p className="text-xs text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">...</div>
            <p className="text-xs text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
          <Webhook className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeConnections}</div>
          <p className="text-xs text-muted-foreground">
            Webhooks configurados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos Processados</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.processedEvents}</div>
          <p className="text-xs text-muted-foreground">
            +{stats.eventsLast24h} nas últimas 24h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successRate}%</div>
          <p className="text-xs text-muted-foreground">
            Eventos processados com sucesso
          </p>
        </CardContent>
      </Card>
    </>
  );
}