
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Users, DollarSign, TrendingUp } from "lucide-react";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  recentReferrals: Array<{
    id: string;
    referred_name: string;
    created_at: string;
    bonus_amount: number;
  }>;
}

interface ReferralSettings {
  vip_commission: number;
  pro_commission: number;
  min_payout: number;
}

export const ReferralSystem = () => {
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    totalReferrals: 0,
    totalEarnings: 0,
    availableBalance: 0,
    recentReferrals: []
  });
  const [settings, setSettings] = useState<ReferralSettings>({
    vip_commission: 20,
    pro_commission: 40,
    min_payout: 50
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
    fetchReferralSettings();
  }, []);

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar dados do perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, referral_earnings')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Buscar referrals feitos pelo usuário
      const { data: referrals } = await supabase
        .from('referrals')
        .select(`
          id,
          bonus_amount,
          created_at,
          referred_id,
          profiles!referrals_referred_id_fkey(full_name)
        `)
        .eq('referrer_id', profile.id);

      const recentReferrals = (referrals || []).map(ref => ({
        id: ref.id,
        referred_name: ref.profiles?.full_name || 'Usuário',
        created_at: ref.created_at,
        bonus_amount: ref.bonus_amount
      }));

      setReferralData({
        referralCode: profile.referral_code,
        totalReferrals: referrals?.length || 0,
        totalEarnings: profile.referral_earnings || 0,
        availableBalance: profile.referral_earnings || 0,
        recentReferrals
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralSettings = async () => {
    try {
      const { data: vipSetting } = await supabase
        .from('referral_settings')
        .select('amount, commission_type, min_payout')
        .eq('target_plan', 'vip')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: proSetting } = await supabase
        .from('referral_settings')
        .select('amount, commission_type, min_payout')
        .eq('target_plan', 'pro')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setSettings({
        vip_commission: vipSetting?.amount || 20,
        pro_commission: proSetting?.amount || 40,
        min_payout: vipSetting?.min_payout || 50
      });
    } catch (error) {
      console.error('Error fetching referral settings:', error);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/?ref=${referralData.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copiado!",
      description: "O link de indicação foi copiado para a área de transferência",
    });
  };

  const requestWithdrawal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (referralData.availableBalance < settings.min_payout) {
        toast({
          title: "Saldo insuficiente",
          description: `Valor mínimo para saque é R$ ${settings.min_payout.toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }

      // Buscar chave PIX do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('pix_key')
        .eq('user_id', user.id)
        .single();

      if (!profile?.pix_key) {
        toast({
          title: "Chave PIX necessária",
          description: "Configure sua chave PIX nas configurações antes de solicitar o saque",
          variant: "destructive",
        });
        return;
      }

      // Criar solicitação de saque
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: referralData.availableBalance,
          pix_key: profile.pix_key,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de saque foi enviada e será processada em até 48h",
      });

      fetchReferralData(); // Atualizar dados
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar saque",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Programa de Indicação</h3>
        <p className="text-sm text-muted-foreground">
          Indique amigos e ganhe comissões por cada assinatura
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indicações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralData.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Total de indicações ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {referralData.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Acumulado desde o início
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {referralData.availableBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Disponível para saque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Link de Indicação */}
      <Card>
        <CardHeader>
          <CardTitle>Seu Link de Indicação</CardTitle>
          <CardDescription>
            Compartilhe este link para ganhar comissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              value={`${window.location.origin}/?ref=${referralData.referralCode}`}
              readOnly
              className="flex-1"
            />
            <Button onClick={copyReferralLink} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Seu código: <Badge variant="secondary">{referralData.referralCode}</Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela de Comissões</CardTitle>
          <CardDescription>
            Valores que você recebe por cada indicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Plano VIP (R$ 97,00)</span>
              <Badge className="bg-blue-100 text-blue-800">
                R$ {settings.vip_commission.toFixed(2)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Plano Pro (R$ 197,00)</span>
              <Badge className="bg-purple-100 text-purple-800">
                R$ {settings.pro_commission.toFixed(2)}
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Valor mínimo para saque: R$ {settings.min_payout.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Saque */}
      {referralData.availableBalance >= settings.min_payout && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitar Saque</CardTitle>
            <CardDescription>
              Transfira seus ganhos via PIX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={requestWithdrawal} className="w-full">
              Solicitar Saque de R$ {referralData.availableBalance.toFixed(2)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Indicações Recentes */}
      {referralData.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indicações Recentes</CardTitle>
            <CardDescription>
              Suas últimas indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralData.recentReferrals.slice(0, 5).map(referral => (
                <div key={referral.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{referral.referred_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    +R$ {referral.bonus_amount.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
