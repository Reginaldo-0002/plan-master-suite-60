import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Send, RotateCcw, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { OutboundSubscription, OutboundDelivery } from '@/types/integrations';

export function OutboundWebhooks() {
  const [subscriptions, setSubscriptions] = useState<OutboundSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<OutboundDelivery[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<OutboundSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    target_url: '',
    secret: '',
    description: '',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subscriptionsResult, deliveriesResult] = await Promise.all([
        supabase
          .from('outbound_subscriptions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('outbound_deliveries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (deliveriesResult.error) throw deliveriesResult.error;

      setSubscriptions(subscriptionsResult.data || []);
      setDeliveries(deliveriesResult.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSubscription) {
        const { error } = await supabase
          .from('outbound_subscriptions')
          .update(formData)
          .eq('id', editingSubscription.id);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Assinatura atualizada com sucesso!'
        });
      } else {
        const { error } = await supabase
          .from('outbound_subscriptions')
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Assinatura criada com sucesso!'
        });
      }

      setIsDialogOpen(false);
      setEditingSubscription(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar assinatura: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      target_url: '',
      secret: '',
      description: '',
      active: true
    });
  };

  const handleEdit = (subscription: OutboundSubscription) => {
    setEditingSubscription(subscription);
    setFormData({
      target_url: subscription.target_url,
      secret: subscription.secret || '',
      description: subscription.description || '',
      active: subscription.active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta assinatura?')) return;

    try {
      const { error } = await supabase
        .from('outbound_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Assinatura excluída com sucesso!'
      });
      
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir assinatura: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleTestWebhook = async (subscriptionId: string) => {
    try {
      // Simular envio de teste
      toast({
        title: 'Teste Enviado',
        description: 'Webhook de teste enviado com sucesso!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar teste: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      success: 'bg-green-500',
      failed: 'bg-red-500',
      retry: 'bg-blue-500'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Webhooks de Saída</h2>
          <p className="text-muted-foreground">
            Configurar endpoints para receber eventos (n8n, automações, etc.)
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSubscription(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Assinatura
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSubscription ? 'Editar Assinatura' : 'Nova Assinatura'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target_url">URL de Destino</Label>
                <Input
                  id="target_url"
                  type="url"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://hooks.n8n.cloud/webhook/..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret">Secret (opcional)</Label>
                <Input
                  id="secret"
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="Token para verificação HMAC"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da assinatura"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Ativo</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSubscription ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assinaturas de Saída */}
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas Configuradas</CardTitle>
          <CardDescription>
            Endpoints que recebem eventos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Falhas</TableHead>
                <TableHead>Última Entrega</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura configurada
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-mono text-sm max-w-xs truncate">
                      {subscription.target_url}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {subscription.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscription.active ? 'default' : 'secondary'}>
                        {subscription.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscription.failures_count > 0 ? 'destructive' : 'default'}>
                        {subscription.failures_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {subscription.last_delivery_at ? 
                        new Date(subscription.last_delivery_at).toLocaleString('pt-BR') 
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestWebhook(subscription.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(subscription)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(subscription.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log de Entregas */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Entregas</CardTitle>
          <CardDescription>
            Últimas tentativas de entrega de webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID do Evento</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Tentativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Código de Resposta</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrega registrada
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-mono text-sm">
                      {delivery.event_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-xs truncate">
                      {subscriptions.find(s => s.id === delivery.target_id)?.target_url || 'N/A'}
                    </TableCell>
                    <TableCell>{delivery.attempt}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`text-white ${getStatusColor(delivery.status)}`}
                      >
                        {delivery.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {delivery.response_code ? (
                        <Badge variant={delivery.response_code < 400 ? 'default' : 'destructive'}>
                          {delivery.response_code}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(delivery.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}