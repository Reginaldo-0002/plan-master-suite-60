
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReferralSetting {
  id: string;
  commission_type: 'fixed' | 'percentage';
  amount: number;
  target_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
  min_payout: number;
  description: string | null;
  max_referrals_per_user: number | null;
  created_at: string;
  updated_at: string;
}

export const AdminReferralSettings = () => {
  const [settings, setSettings] = useState<ReferralSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSetting, setEditingSetting] = useState<ReferralSetting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    commission_type: 'percentage' as 'fixed' | 'percentage',
    amount: 0,
    target_plan: 'vip' as 'free' | 'vip' | 'pro',
    is_active: true,
    min_payout: 50,
    description: '',
    max_referrals_per_user: null as number | null
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching referral settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de indicação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      toast({
        title: "Erro",
        description: "O valor da comissão deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingSetting) {
        const { error } = await supabase
          .from('referral_settings')
          .update({
            ...formData,
            max_referrals_per_user: formData.max_referrals_per_user || null
          })
          .eq('id', editingSetting.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Configuração atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('referral_settings')
          .insert([{
            ...formData,
            max_referrals_per_user: formData.max_referrals_per_user || null
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Configuração criada com sucesso",
        });
      }

      resetForm();
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving referral setting:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      commission_type: 'percentage',
      amount: 0,
      target_plan: 'vip',
      is_active: true,
      min_payout: 50,
      description: '',
      max_referrals_per_user: null
    });
    setEditingSetting(null);
    setShowForm(false);
  };

  const startEdit = (setting: ReferralSetting) => {
    setEditingSetting(setting);
    setFormData({
      commission_type: setting.commission_type,
      amount: setting.amount,
      target_plan: setting.target_plan,
      is_active: setting.is_active,
      min_payout: setting.min_payout,
      description: setting.description || '',
      max_referrals_per_user: setting.max_referrals_per_user
    });
    setShowForm(true);
  };

  const toggleActive = async (setting: ReferralSetting) => {
    try {
      const { error } = await supabase
        .from('referral_settings')
        .update({ is_active: !setting.is_active })
        .eq('id', setting.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Configuração ${!setting.is_active ? 'ativada' : 'desativada'} com sucesso`,
      });

      fetchSettings();
    } catch (error: any) {
      console.error('Error toggling setting:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar configuração",
        variant: "destructive",
      });
    }
  };

  const deleteSetting = async (settingId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta configuração?")) return;

    try {
      const { error } = await supabase
        .from('referral_settings')
        .delete()
        .eq('id', settingId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configuração excluída com sucesso",
      });

      fetchSettings();
    } catch (error: any) {
      console.error('Error deleting setting:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir configuração",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const formatCommission = (setting: ReferralSetting) => {
    if (setting.commission_type === 'fixed') {
      return `R$ ${setting.amount.toFixed(2)}`;
    } else {
      return `${setting.amount}%`;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-futuristic-primary">Configurações de Indicação</h2>
          <p className="text-muted-foreground">Configure comissões e regras para o programa de indicações</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-futuristic-gradient hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      {showForm && (
        <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
          <CardHeader>
            <CardTitle className="text-futuristic-primary">
              {editingSetting ? 'Editar Configuração' : 'Nova Configuração'}
            </CardTitle>
            <CardDescription>
              Configure valores de comissão por plano e tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_plan">Plano Alvo</Label>
                  <Select value={formData.target_plan} onValueChange={(value: 'free' | 'vip' | 'pro') => setFormData({ ...formData, target_plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="commission_type">Tipo de Comissão</Label>
                  <Select value={formData.commission_type} onValueChange={(value: 'fixed' | 'percentage') => setFormData({ ...formData, commission_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {formData.commission_type === 'fixed' ? 'Valor da Comissão (R$)' : 'Percentual da Comissão (%)'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder={formData.commission_type === 'fixed' ? '10.00' : '5'}
                      className="pl-8"
                    />
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      {formData.commission_type === 'fixed' ? 
                        <DollarSign className="w-4 h-4 text-muted-foreground" /> : 
                        <Percent className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_payout">Valor Mínimo para Saque (R$)</Label>
                  <Input
                    id="min_payout"
                    type="number"
                    step="0.01"
                    value={formData.min_payout}
                    onChange={(e) => setFormData({ ...formData, min_payout: parseFloat(e.target.value) || 0 })}
                    placeholder="50.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_referrals">Máximo de Indicações por Usuário (opcional)</Label>
                <Input
                  id="max_referrals"
                  type="number"
                  value={formData.max_referrals_per_user || ''}
                  onChange={(e) => setFormData({ ...formData, max_referrals_per_user: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da configuração"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Configuração ativa</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-futuristic-gradient hover:opacity-90">
                  {editingSetting ? 'Atualizar' : 'Criar'} Configuração
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {settings.length === 0 ? (
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Nenhuma configuração de indicação criada ainda</p>
                <Button onClick={() => setShowForm(true)} variant="outline">
                  Criar primeira configuração
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          settings.map((setting) => (
            <Card key={setting.id} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getPlanBadgeColor(setting.target_plan)}>
                        {setting.target_plan.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-futuristic-accent">
                        {formatCommission(setting)}
                      </Badge>
                      <Badge variant={setting.is_active ? "default" : "secondary"}>
                        {setting.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Valor mínimo para saque: R$ {setting.min_payout.toFixed(2)}</p>
                      {setting.max_referrals_per_user && (
                        <p>Máximo de indicações: {setting.max_referrals_per_user}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(setting)}
                      className={setting.is_active ? "border-yellow-500 text-yellow-500" : "border-green-500 text-green-500"}
                    >
                      {setting.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(setting)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteSetting(setting.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {setting.description && (
                <CardContent>
                  <p className="text-muted-foreground">{setting.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
