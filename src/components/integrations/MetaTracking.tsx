import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Facebook, Eye, Settings, TestTube, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TrackingMeta, TrackingEvent } from '@/types/integrations';

export function MetaTracking() {
  const [trackingConfig, setTrackingConfig] = useState<TrackingMeta | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    pixel_id: '',
    access_token: '',
    test_event_code: '',
    enable_client: true,
    enable_server: true,
    enable_dedup: true,
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configResult, eventsResult] = await Promise.all([
        supabase
          .from('tracking_meta')
          .select('*')
          .eq('active', true)
          .limit(1)
          .single(),
        supabase
          .from('tracking_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (configResult.data) {
        setTrackingConfig(configResult.data);
        setFormData({
          pixel_id: configResult.data.pixel_id,
          access_token: configResult.data.access_token,
          test_event_code: configResult.data.test_event_code || '',
          enable_client: configResult.data.enable_client,
          enable_server: configResult.data.enable_server,
          enable_dedup: configResult.data.enable_dedup,
          active: configResult.data.active
        });
      }

      if (eventsResult.data) {
        setTrackingEvents(eventsResult.data);
      }
    } catch (error: any) {
      // Ignorar erro se não há configuração ainda
      console.log('Nenhuma configuração encontrada');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (trackingConfig) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('tracking_meta')
          .update(formData)
          .eq('id', trackingConfig.id);
        
        if (error) throw error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('tracking_meta')
          .insert([formData]);
        
        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Configuração do Meta Pixel salva com sucesso!'
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEvent = async (eventType: string) => {
    try {
      // Enviar evento real para a edge function
      const { data, error } = await supabase.functions.invoke('meta-conversions-api', {
        body: {
          event_name: eventType,
          event_id: `test_${Date.now()}`,
          user_email: 'test@example.com',
          value: eventType === 'Purchase' ? 99.99 : undefined,
          currency: 'BRL',
          external_order_id: `test_order_${Date.now()}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Teste Enviado',
        description: `Evento de teste "${eventType}" enviado com sucesso para o Meta!`
      });

      // Recarregar eventos para mostrar o novo
      setTimeout(() => loadData(), 1000);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar evento de teste: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Facebook className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">Meta Pixel & Conversions API</h2>
          <p className="text-muted-foreground">
            Configure o rastreamento Facebook/Meta para suas conversões
          </p>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testes
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Meta Pixel</CardTitle>
              <CardDescription>
                Configure suas credenciais do Facebook/Meta para rastreamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pixel_id">Pixel ID</Label>
                    <Input
                      id="pixel_id"
                      value={formData.pixel_id}
                      onChange={(e) => setFormData({ ...formData, pixel_id: e.target.value })}
                      placeholder="123456789012345"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="access_token">Access Token (CAPI)</Label>
                    <Input
                      id="access_token"
                      type="password"
                      value={formData.access_token}
                      onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                      placeholder="EAAxxxxxxxxxxxxx"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="test_event_code">Test Event Code (opcional)</Label>
                    <Input
                      id="test_event_code"
                      value={formData.test_event_code}
                      onChange={(e) => setFormData({ ...formData, test_event_code: e.target.value })}
                      placeholder="TEST12345"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Configurações de Rastreamento</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable_client">Pixel Client-Side</Label>
                      <p className="text-sm text-muted-foreground">JavaScript no navegador</p>
                    </div>
                    <Switch
                      id="enable_client"
                      checked={formData.enable_client}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable_client: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable_server">Conversions API</Label>
                      <p className="text-sm text-muted-foreground">Envio server-side</p>
                    </div>
                    <Switch
                      id="enable_server"
                      checked={formData.enable_server}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable_server: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable_dedup">Deduplicação</Label>
                      <p className="text-sm text-muted-foreground">Event ID compartilhado</p>
                    </div>
                    <Switch
                      id="enable_dedup"
                      checked={formData.enable_dedup}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable_dedup: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="active">Ativo</Label>
                      <p className="text-sm text-muted-foreground">Habilitar rastreamento</p>
                    </div>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {trackingConfig && (
            <Alert>
              <Facebook className="h-4 w-4" />
              <AlertDescription>
                Meta Pixel configurado e ativo. Os eventos serão rastreados automaticamente.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log de Eventos</CardTitle>
              <CardDescription>
                Histórico de eventos enviados para o Meta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackingEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum evento rastreado ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    trackingEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.event_name}</TableCell>
                        <TableCell className="font-mono text-sm">{event.event_id}</TableCell>
                        <TableCell>
                          <Badge variant={event.source === 'client' ? 'default' : 'secondary'}>
                            {event.source === 'client' ? 'Client' : 'Server'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={event.success ? 'default' : 'destructive'}>
                            {event.success ? 'Sucesso' : 'Falha'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(event.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Lab - Meta Pixel</CardTitle>
              <CardDescription>
                Envie eventos de teste para validar sua configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleTestEvent('PageView')}
                  className="h-20 flex flex-col"
                >
                  <Eye className="h-6 w-6 mb-2" />
                  PageView
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleTestEvent('ViewContent')}
                  className="h-20 flex flex-col"
                >
                  <Eye className="h-6 w-6 mb-2" />
                  ViewContent
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleTestEvent('InitiateCheckout')}
                  className="h-20 flex flex-col"
                >
                  <Eye className="h-6 w-6 mb-2" />
                  InitiateCheckout
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleTestEvent('Purchase')}
                  className="h-20 flex flex-col"
                >
                  <Eye className="h-6 w-6 mb-2" />
                  Purchase
                </Button>
              </div>
              
              {formData.test_event_code && (
                <Alert>
                  <TestTube className="h-4 w-4" />
                  <AlertDescription>
                    Eventos de teste configurados com código: {formData.test_event_code}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacidade e Consentimento</CardTitle>
              <CardDescription>
                Configurações de privacidade e LGPD/GDPR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Certifique-se de obter o consentimento adequado dos usuários 
                  antes de ativar o rastreamento, conforme exigido pela LGPD e GDPR.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Boas Práticas</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Implemente um banner de cookies com opções de consentimento</li>
                  <li>• Permita que usuários retirem o consentimento a qualquer momento</li>
                  <li>• Use hash (SHA256) para dados pessoais enviados via CAPI</li>
                  <li>• Configure a retenção de dados no Meta Business Manager</li>
                  <li>• Documente quais eventos são coletados em sua política de privacidade</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}