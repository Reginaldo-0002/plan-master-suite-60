import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Globe, Shield, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WebhookEndpoint } from '@/types/integrations';

export function WebhookEndpoints() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    provider: 'hotmart' | 'kiwify' | 'caktor' | 'generic';
    url: string;
    secret: string;
    description: string;
    active: boolean;
  }>({
    provider: 'hotmart',
    url: '',
    secret: '',
    description: '',
    active: true
  });

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEndpoints(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar endpoints: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEndpoint) {
        const { error } = await supabase
          .from('webhook_endpoints')
          .update(formData)
          .eq('id', editingEndpoint.id);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Endpoint atualizado com sucesso!'
        });
      } else {
        const { error } = await supabase
          .from('webhook_endpoints')
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Endpoint criado com sucesso!'
        });
      }

      setIsDialogOpen(false);
      setEditingEndpoint(null);
      resetForm();
      loadEndpoints();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar endpoint: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'hotmart',
      url: '',
      secret: '',
      description: '',
      active: true
    });
  };

  const handleEdit = (endpoint: WebhookEndpoint) => {
    setEditingEndpoint(endpoint);
    setFormData({
      provider: endpoint.provider,
      url: endpoint.url,
      secret: endpoint.secret,
      description: endpoint.description || '',
      active: endpoint.active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (endpointId: string) => {
    if (!confirm('Tem certeza que deseja excluir este endpoint?')) return;

    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', endpointId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Endpoint excluído com sucesso!'
      });
      
      loadEndpoints();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir endpoint: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const getProviderInfo = (provider: string) => {
    const providers = {
      hotmart: { name: 'Hotmart', color: 'bg-orange-500' },
      kiwify: { name: 'Kiwify', color: 'bg-green-500' },
      caktor: { name: 'Caktor', color: 'bg-blue-500' },
      generic: { name: 'Genérico', color: 'bg-gray-500' }
    };
    return providers[provider as keyof typeof providers] || providers.generic;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Conexões e Endpoints</h2>
          <p className="text-muted-foreground">
            Configure webhooks para Hotmart, Kiwify, Caktor e outros
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEndpoint(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEndpoint ? 'Editar Conexão' : 'Nova Conexão'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Plataforma</Label>
                <Select value={formData.provider} onValueChange={(value: any) => setFormData({ ...formData, provider: value })}>
                  <SelectTrigger>
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
                <Label htmlFor="url">URL do Webhook</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://api.exemplo.com/webhook"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret">Secret/Token</Label>
                <Input
                  id="secret"
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="Token de verificação"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da conexão"
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
                  {editingEndpoint ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plataformas de Integração */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['hotmart', 'kiwify', 'caktor', 'generic'].map((provider) => {
          const info = getProviderInfo(provider);
          const endpoint = endpoints.find(e => e.provider === provider && e.active);
          
          return (
            <Card key={provider}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${info.color}`} />
                  <CardTitle className="text-lg">{info.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={endpoint ? 'default' : 'secondary'}>
                    {endpoint ? 'Configurado' : 'Não configurado'}
                  </Badge>
                  {endpoint ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                {endpoint && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    {endpoint.url}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints Configurados</CardTitle>
          <CardDescription>
            Lista de todas as conexões de webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plataforma</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Check</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum endpoint configurado
                  </TableCell>
                </TableRow>
              ) : (
                endpoints.map((endpoint) => {
                  const info = getProviderInfo(endpoint.provider);
                  return (
                    <TableRow key={endpoint.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${info.color}`} />
                          <span>{info.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-xs truncate">
                        {endpoint.url}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {endpoint.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.active ? 'default' : 'secondary'}>
                          {endpoint.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {endpoint.last_healthcheck_at ? 
                          new Date(endpoint.last_healthcheck_at).toLocaleString('pt-BR') 
                          : 'Nunca'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(endpoint)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(endpoint.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}