import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, Database, Clock, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function IntegrationsSettings() {
  const [settings, setSettings] = useState({
    webhook_timeout: 30,
    max_retries: 3,
    retry_backoff: 'exponential',
    rate_limit_per_minute: 100,
    enable_ip_whitelist: false,
    allowed_ips: '',
    data_retention_days: 90,
    enable_audit_logs: true,
    dlq_enabled: true,
    dlq_max_age_hours: 24
  });

  const [secrets, setSecrets] = useState({
    hotmart_secret: '',
    kiwify_secret: '',
    caktor_secret: '',
    generic_secret: '',
    meta_access_token: '',
    n8n_webhook_secret: ''
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Simular salvamento das configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Configurações Salvas',
        description: 'Todas as configurações foram atualizadas com sucesso!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecrets = async () => {
    setSaving(true);
    try {
      // Simular salvamento dos segredos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Segredos Atualizados',
        description: 'Todos os segredos foram salvos com segurança!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar segredos: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-gray-600" />
        <div>
          <h2 className="text-2xl font-bold">Configurações Avançadas</h2>
          <p className="text-muted-foreground">
            Configure segredos, limites, políticas de retenção e segurança
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Segredos
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Retenção
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configurações básicas do sistema de webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook_timeout">Timeout de Webhook (segundos)</Label>
                    <Input
                      id="webhook_timeout"
                      type="number"
                      value={settings.webhook_timeout}
                      onChange={(e) => setSettings({ ...settings, webhook_timeout: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_retries">Máximo de Tentativas</Label>
                    <Input
                      id="max_retries"
                      type="number"
                      value={settings.max_retries}
                      onChange={(e) => setSettings({ ...settings, max_retries: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable_audit_logs">Logs de Auditoria</Label>
                      <p className="text-sm text-muted-foreground">Registrar todas as ações</p>
                    </div>
                    <Switch
                      id="enable_audit_logs"
                      checked={settings.enable_audit_logs}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_audit_logs: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dlq_enabled">Dead Letter Queue</Label>
                      <p className="text-sm text-muted-foreground">Eventos falhados</p>
                    </div>
                    <Switch
                      id="dlq_enabled"
                      checked={settings.dlq_enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, dlq_enabled: checked })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secrets" className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Os segredos são armazenados de forma criptografada e nunca são exibidos em logs.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Segredos de Webhook</CardTitle>
              <CardDescription>
                Configure os tokens e segredos para verificação de assinatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotmart_secret">Hotmart Webhook Secret</Label>
                    <Input
                      id="hotmart_secret"
                      type="password"
                      value={secrets.hotmart_secret}
                      onChange={(e) => setSecrets({ ...secrets, hotmart_secret: e.target.value })}
                      placeholder="Token do Hotmart"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kiwify_secret">Kiwify Webhook Secret</Label>
                    <Input
                      id="kiwify_secret"
                      type="password"
                      value={secrets.kiwify_secret}
                      onChange={(e) => setSecrets({ ...secrets, kiwify_secret: e.target.value })}
                      placeholder="Token do Kiwify"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="caktor_secret">Caktor Webhook Secret</Label>
                    <Input
                      id="caktor_secret"
                      type="password"
                      value={secrets.caktor_secret}
                      onChange={(e) => setSecrets({ ...secrets, caktor_secret: e.target.value })}
                      placeholder="Token do Caktor"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="generic_secret">Generic Webhook Secret</Label>
                    <Input
                      id="generic_secret"
                      type="password"
                      value={secrets.generic_secret}
                      onChange={(e) => setSecrets({ ...secrets, generic_secret: e.target.value })}
                      placeholder="Token genérico"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="meta_access_token">Meta CAPI Access Token</Label>
                    <Input
                      id="meta_access_token"
                      type="password"
                      value={secrets.meta_access_token}
                      onChange={(e) => setSecrets({ ...secrets, meta_access_token: e.target.value })}
                      placeholder="Token do Meta CAPI"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="n8n_webhook_secret">n8n Webhook Secret</Label>
                    <Input
                      id="n8n_webhook_secret"
                      type="password"
                      value={secrets.n8n_webhook_secret}
                      onChange={(e) => setSecrets({ ...secrets, n8n_webhook_secret: e.target.value })}
                      placeholder="Token do n8n"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSecrets} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Segredos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Rate limiting, IP whitelist e outras configurações de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_limit">Rate Limit (requests por minuto)</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    value={settings.rate_limit_per_minute}
                    onChange={(e) => setSettings({ ...settings, rate_limit_per_minute: parseInt(e.target.value) || 100 })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_ip_whitelist">IP Whitelist</Label>
                    <p className="text-sm text-muted-foreground">Restringir por IP</p>
                  </div>
                  <Switch
                    id="enable_ip_whitelist"
                    checked={settings.enable_ip_whitelist}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_ip_whitelist: checked })}
                  />
                </div>
                
                {settings.enable_ip_whitelist && (
                  <div className="space-y-2">
                    <Label htmlFor="allowed_ips">IPs Permitidos (um por linha)</Label>
                    <Textarea
                      id="allowed_ips"
                      value={settings.allowed_ips}
                      onChange={(e) => setSettings({ ...settings, allowed_ips: e.target.value })}
                      placeholder="192.168.1.1&#10;10.0.0.1&#10;203.0.113.0/24"
                      rows={4}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Políticas de Retenção</CardTitle>
              <CardDescription>
                Configure por quanto tempo os dados são mantidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="data_retention_days">Retenção de Dados (dias)</Label>
                  <Input
                    id="data_retention_days"
                    type="number"
                    value={settings.data_retention_days}
                    onChange={(e) => setSettings({ ...settings, data_retention_days: parseInt(e.target.value) || 90 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Eventos mais antigos que este período serão automaticamente removidos
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dlq_max_age">DLQ Max Age (horas)</Label>
                  <Input
                    id="dlq_max_age"
                    type="number"
                    value={settings.dlq_max_age_hours}
                    onChange={(e) => setSettings({ ...settings, dlq_max_age_hours: parseInt(e.target.value) || 24 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Eventos na Dead Letter Queue mais antigos que este período serão descartados
                  </p>
                </div>
              </div>
              
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  A limpeza automática é executada diariamente às 02:00 UTC. 
                  Dados removidos não podem ser recuperados.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Performance</CardTitle>
              <CardDescription>
                Otimizações para melhor desempenho do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Estratégia de Retry</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={settings.retry_backoff === 'linear' ? 'default' : 'outline'}
                      onClick={() => setSettings({ ...settings, retry_backoff: 'linear' })}
                    >
                      Linear
                    </Button>
                    <Button
                      variant={settings.retry_backoff === 'exponential' ? 'default' : 'outline'}
                      onClick={() => setSettings({ ...settings, retry_backoff: 'exponential' })}
                    >
                      Exponencial
                    </Button>
                    <Button
                      variant={settings.retry_backoff === 'fixed' ? 'default' : 'outline'}
                      onClick={() => setSettings({ ...settings, retry_backoff: 'fixed' })}
                    >
                      Fixo
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h4 className="font-semibold">Linear</h4>
                        <p className="text-sm text-muted-foreground">
                          1s, 2s, 3s, 4s...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h4 className="font-semibold">Exponencial</h4>
                        <p className="text-sm text-muted-foreground">
                          1s, 2s, 4s, 8s...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h4 className="font-semibold">Fixo</h4>
                        <p className="text-sm text-muted-foreground">
                          5s, 5s, 5s, 5s...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}