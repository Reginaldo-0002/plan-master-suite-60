
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Users, DollarSign, Gift } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Profile } from "@/types/profile";
import { useOptimizedNavigation } from "@/hooks/useOptimizedNavigation";

interface ReferralSystemProps {
  profile: Profile;
}

interface ReferralData {
  total_referrals: number;
  total_earnings: number;
  recent_referrals: Array<{
    id: string;
    referred_name: string;
    bonus_amount: number;
    created_at: string;
  }>;
}

export const ReferralSystem = ({ profile }: ReferralSystemProps) => {
  const [referralData, setReferralData] = useState<ReferralData>({
    total_referrals: 0,
    total_earnings: 0,
    recent_referrals: []
  });
  const [loading, setLoading] = useState(true);
  const { navigateToPlans } = useOptimizedNavigation();
  const { toast } = useToast();

  const referralLink = `${window.location.origin}?ref=${profile.referral_code}`;

  useEffect(() => {
    fetchReferralData();
  }, [profile.user_id]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          bonus_amount,
          created_at,
          referred_id
        `)
        .eq('referrer_id', profile.user_id);

      if (error) throw error;

      const totalReferrals = referrals?.length || 0;
      const totalEarnings = referrals?.reduce((sum, ref) => sum + (ref.bonus_amount || 0), 0) || 0;

      setReferralData({
        total_referrals: totalReferrals,
        total_earnings: totalEarnings,
        recent_referrals: referrals?.slice(0, 5).map(ref => ({
          id: ref.id,
          referred_name: `Usuário ${ref.referred_id.slice(0, 8)}`,
          bonus_amount: ref.bonus_amount || 0,
          created_at: ref.created_at
        })) || []
      });

    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de indicações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Sucesso",
        description: "Link de indicação copiado para a área de transferência!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar link. Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: "Sucesso",
        description: "Código de indicação copiado!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar código.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Sistema de Indicações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Sistema de Indicações
          </CardTitle>
          <CardDescription>
            Indique amigos e ganhe comissões por cada nova assinatura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{referralData.total_referrals}</div>
              <div className="text-sm text-muted-foreground">Indicações</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">R$ {referralData.total_earnings.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Ganhos Totais</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Gift className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">15%</div>
              <div className="text-sm text-muted-foreground">Comissão VIP</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Seu Código de Indicação</label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={profile.referral_code} 
                  readOnly 
                  className="bg-muted"
                />
                <Button variant="outline" size="icon" onClick={copyReferralCode}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Link de Indicação</label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="bg-muted text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold">Como Funciona</h4>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="min-w-fit">1</Badge>
                <span>Compartilhe seu link ou código de indicação</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="min-w-fit">2</Badge>
                <span>Seus amigos se cadastram usando seu código</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="min-w-fit">3</Badge>
                <span>Quando eles assinam o plano VIP, você ganha 15% de comissão</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="min-w-fit">4</Badge>
                <span>Solicite o saque quando atingir R$ 50,00</span>
              </div>
            </div>
          </div>

          {referralData.recent_referrals.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Indicações Recentes</h4>
                <div className="space-y-2">
                  {referralData.recent_referrals.map((referral) => (
                    <div key={referral.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <div>
                        <div className="font-medium">{referral.referred_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        +R$ {referral.bonus_amount.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
