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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Plan, PlatformProduct } from '@/types/integrations';

export function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingProduct, setEditingProduct] = useState<PlatformProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [planFormData, setPlanFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price_cents: 0,
    interval: 'monthly',
    features: [] as string[],
    active: true
  });

  const [productFormData, setProductFormData] = useState({
    plan_id: '',
    platform: 'hotmart' as 'hotmart' | 'kiwify' | 'caktor' | 'generic',
    product_id: '',
    price_id: '',
    checkout_url: '',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansResult, productsResult] = await Promise.all([
        supabase
          .from('plans')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('platform_products')
          .select('*, plans!inner(*)')
          .order('created_at', { ascending: false })
      ]);

      if (plansResult.error) throw plansResult.error;
      if (productsResult.error) throw productsResult.error;

      setPlans(plansResult.data || []);
      setProducts((productsResult.data || []).map(p => ({
        ...p,
        metadata: p.metadata as Record<string, any>
      })));
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

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...planFormData,
        features: JSON.stringify(planFormData.features)
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Plano atualizado com sucesso!'
        });
      } else {
        const { error } = await supabase
          .from('plans')
          .insert([planData]);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Plano criado com sucesso!'
        });
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      resetPlanForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar plano: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('platform_products')
          .update(productFormData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Produto atualizado com sucesso!'
        });
      } else {
        const { error } = await supabase
          .from('platform_products')
          .insert([productFormData]);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Produto criado com sucesso!'
        });
      }

      setIsProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar produto: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const resetPlanForm = () => {
    setPlanFormData({
      name: '',
      slug: '',
      description: '',
      price_cents: 0,
      interval: 'monthly',
      features: [],
      active: true
    });
  };

  const resetProductForm = () => {
    setProductFormData({
      plan_id: '',
      platform: 'hotmart',
      product_id: '',
      price_id: '',
      checkout_url: '',
      active: true
    });
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_cents: plan.price_cents,
      interval: plan.interval,
      features: Array.isArray(plan.features) ? plan.features : [],
      active: plan.active
    });
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: PlatformProduct) => {
    setEditingProduct(product);
    setProductFormData({
      plan_id: product.plan_id,
      platform: product.platform,
      product_id: product.product_id,
      price_id: product.price_id || '',
      checkout_url: product.checkout_url || '',
      active: product.active
    });
    setIsProductDialogOpen(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano excluído com sucesso!'
      });
      
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir plano: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getPlatformInfo = (platform: string) => {
    const platforms = {
      hotmart: { name: 'Hotmart', color: 'bg-orange-500' },
      kiwify: { name: 'Kiwify', color: 'bg-green-500' },
      caktor: { name: 'Caktor', color: 'bg-blue-500' },
      generic: { name: 'Genérico', color: 'bg-gray-500' }
    };
    return platforms[platform as keyof typeof platforms] || platforms.generic;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Planos</h2>
          <p className="text-muted-foreground">
            Configure planos e produtos das plataformas
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { setEditingProduct(null); resetProductForm(); }}>
                <Package className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan_id">Plano</Label>
                  <Select value={productFormData.plan_id} onValueChange={(value) => setProductFormData({ ...productFormData, plan_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma</Label>
                  <Select value={productFormData.platform} onValueChange={(value: any) => setProductFormData({ ...productFormData, platform: value })}>
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
                  <Label htmlFor="product_id">ID do Produto</Label>
                  <Input
                    id="product_id"
                    value={productFormData.product_id}
                    onChange={(e) => setProductFormData({ ...productFormData, product_id: e.target.value })}
                    placeholder="ID na plataforma"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="checkout_url">URL de Checkout</Label>
                  <Input
                    id="checkout_url"
                    type="url"
                    value={productFormData.checkout_url}
                    onChange={(e) => setProductFormData({ ...productFormData, checkout_url: e.target.value })}
                    placeholder="https://checkout.exemplo.com"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={productFormData.active}
                    onCheckedChange={(checked) => setProductFormData({ ...productFormData, active: checked })}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProduct ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPlan(null); resetPlanForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                    placeholder="Nome do plano"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={planFormData.slug}
                    onChange={(e) => setPlanFormData({ ...planFormData, slug: e.target.value })}
                    placeholder="slug-do-plano"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price_cents">Preço (R$)</Label>
                  <Input
                    id="price_cents"
                    type="number"
                    step="0.01"
                    value={planFormData.price_cents / 100}
                    onChange={(e) => setPlanFormData({ ...planFormData, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo</Label>
                  <Select value={planFormData.interval} onValueChange={(value) => setPlanFormData({ ...planFormData, interval: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="one_time">Pagamento Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    placeholder="Descrição do plano"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={planFormData.active}
                    onCheckedChange={(checked) => setPlanFormData({ ...planFormData, active: checked })}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPlan ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Planos */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Configurados</CardTitle>
          <CardDescription>
            Lista de todos os planos disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum plano configurado
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const planProducts = products.filter(p => p.plan_id === plan.id);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-semibold">{plan.name}</TableCell>
                      <TableCell className="font-mono text-sm">{plan.slug}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatPrice(plan.price_cents)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {plan.interval === 'monthly' ? 'Mensal' : 
                           plan.interval === 'annual' ? 'Anual' : 
                           'Único'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.active ? 'default' : 'secondary'}>
                          {plan.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {planProducts.map((product) => {
                            const info = getPlatformInfo(product.platform);
                            return (
                              <div
                                key={product.id}
                                className={`w-2 h-2 rounded-full ${info.color}`}
                                title={info.name}
                              />
                            );
                          })}
                          {planProducts.length === 0 && (
                            <span className="text-xs text-muted-foreground">Nenhum</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePlan(plan.id)}
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

      {/* Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos por Plataforma</CardTitle>
          <CardDescription>
            Integração dos planos com as plataformas de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>ID do Produto</TableHead>
                <TableHead>URL de Checkout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum produto configurado
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const plan = plans.find(p => p.id === product.plan_id);
                  const info = getPlatformInfo(product.platform);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-semibold">
                        {plan?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${info.color}`} />
                          <span>{info.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.product_id}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {product.checkout_url ? (
                          <a 
                            href={product.checkout_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {product.checkout_url}
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? 'default' : 'secondary'}>
                          {product.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit2 className="h-4 w-4" />
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