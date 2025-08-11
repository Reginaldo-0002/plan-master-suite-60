
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CommissionType = "fixed" | "percentage";
type UserPlan = "free" | "vip" | "pro";

interface ReferralSetting {
  id: string;
  commission_type: CommissionType;
  amount: number;
  target_plan: UserPlan;
  is_active: boolean;
  min_payout: number;
  description: string | null;
  max_referrals_per_user: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const AdminReferralSettings = () => {
  const [settings, setSettings] = useState<ReferralSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSetting, setEditingSetting] = useState<ReferralSetting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    commission_type: "percentage" as CommissionType,
    amount: 0,
    target_plan: "vip" as UserPlan,
    is_active: true,
    min_payout: 50,
    description: "",
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

      const transformedData: ReferralSetting[] = (data || []).map(item => ({
        id: item.id,
        commission_type: item.commission_type as CommissionType,
        amount: item.amount,
        target_plan: item.target_plan as UserPlan,
        is_active: item.is_active,
        min_payout: item.min_payout,
        description: item.description,
        max_referrals_per_user: item.max_referrals_per_user,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: item.created_by
      }));

      setSettings(transformedData);
    } catch (error: any) {
      console.error('Error fetching referral settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
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
        description: "Valor deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      const settingData = {
        commission_type: formData.commission_type,
        amount: formData.amount,
        target_plan: formData.target_plan,
        is_active: formData.is_active,
        min_payout: formData.min_payout,
        description: formData.description || null,
        max_referrals_per_user: formData.max_referrals_per_user
      };

      if (editingSetting) {
        const { error } = await supabase
          .from('referral_settings')
          .update(settingData)
          .eq('id', editingSetting.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Configuração atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('referral_settings')
          .insert([settingData]);

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
      commission_type: "percentage",
      amount: 0,
      target_plan: "vip",
      is_active: true,
      min_payout: 50,
      description: "",
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
      description: setting.description || "",
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
        description: "Erro ao alterar status",
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

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-futuristic-primary">Configurações de Indicação</h2>
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
              Configure os valores de comissão por indicação para cada plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_plan">Plano Alvo</Label>
                  <Select value={formData.target_plan} onValueChange={(value: UserPlan) => setFormData({ ...formData, target_plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_type">Tipo de Comissão</Label>
                  <Select value={formData.commission_type} onValueChange={(value: CommissionType) => setFormData({ ...formData, commission_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual</SelectItem>
                      <SelectItem value="fixed">Valor Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {formData.commission_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.commission_type === 'percentage' ? '5.00' : '10.00'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_payout">Mínimo para Saque (R$)</Label>
                  <Input
                    id="min_payout"
                    type="number"
                    step="0.01"
                    value={formData.min_payout}
                    onChange={(e) => setFormData({ ...formData, min_payout: parseFloat(e.target.value) || 0 })}
                    placeholder="50.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_referrals">Máx. Indicações por Usuário</Label>
                  <Input
                    id="max_referrals"
                    type="number"
                    value={formData.max_referrals_per_user || ''}
                    onChange={(e) => setFormData({ ...formData, max_referrals_per_user: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da configuração"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Configuração Ativa</Label>
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
        {settings.map((setting) => (
          <Card key={setting.id} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-futuristic-primary flex items-center gap-2">
                    {setting.commission_type === 'percentage' ? (
                      <Percent className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                    Plano {setting.target_plan.toUpperCase()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={setting.is_active ? "default" : "secondary"}>
                      {setting.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">
                      {setting.commission_type === 'percentage' 
                        ? `${setting.amount}%` 
                        : `R$ ${setting.amount.toFixed(2)}`
                      }
                    </Badge>
                    <Badge variant="outline">
                      Mín: R$ {setting.min_payout.toFixed(2)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(setting)}
                    className={setting.is_active ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}
                  >
                    {setting.is_active ? 'Ativo' : 'Inativo'}
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
        ))}
      </div>
    </div>
  );
};
