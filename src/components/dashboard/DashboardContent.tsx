import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock,
  Eye,
  Users,
  DollarSign,
  Copy,
  TrendingUp,
  Star,
  Gem,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro';
  pix_key: string | null;
  total_session_time: number;
  areas_accessed: number;
  referral_code: string;
  referral_earnings: number;
  created_at: string;
  updated_at: string;
}

interface DashboardContentProps {
  profile: Profile | null;
}

export const DashboardContent = ({ profile }: DashboardContentProps) => {
  const [referralCount, setReferralCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.id) {
      fetchReferralCount();
    }
  }, [profile?.id]);

  const fetchReferralCount = async () => {
    try {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', profile?.id);

      if (error) {
        console.error('Error fetching referral count:', error);
        return;
      }

      setReferralCount(count || 0);
    } catch (error) {
      console.error('Error fetching referral count:', error);
    }
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      const referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copiado!",
        description: "Seu link de indicação foi copiado para a área de transferência.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case 'pro':
        return {
          name: 'Pro',
          icon: <Crown className="w-5 h-5" />,
          color: 'bg-plan-pro',
          description: 'Acesso completo a todos os recursos'
        };
      case 'vip':
        return {
          name: 'VIP',
          icon: <Gem className="w-5 h-5" />,
          color: 'bg-plan-vip',
          description: 'Acesso a conteúdo premium'
        };
      default:
        return {
          name: 'Free',
          icon: <Star className="w-5 h-5" />,
          color: 'bg-plan-free',
          description: 'Acesso básico à plataforma'
        };
    }
  };

  const planInfo = getPlanInfo(profile?.plan || 'free');
  const showReferralProgram = profile?.plan === 'vip' || profile?.plan === 'pro';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Bem-vindo de volta, {profile?.full_name || 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo da sua atividade na plataforma.
        </p>
      </div>

      {/* Plan Status Card */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg ${planInfo.color} flex items-center justify-center text-white`}>
                {planInfo.icon}
              </div>
              <div>
                <CardTitle className="text-xl">Plano {planInfo.name}</CardTitle>
                <CardDescription>{planInfo.description}</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Alterar Plano
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatTime(profile?.total_session_time || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Tempo Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profile?.areas_accessed || 0}
                </p>
                <p className="text-sm text-muted-foreground">Áreas Acessadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {showReferralProgram && (
          <>
            <Card className="shadow-card border-card-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {referralCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Indicações</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-card-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {(profile?.referral_earnings || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Ganhos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Referral Program Card */}
      {showReferralProgram && (
        <Card className="shadow-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Programa de Indicação
            </CardTitle>
            <CardDescription>
              Convide amigos e ganhe dinheiro com cada nova assinatura!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary-light rounded-lg border">
              <p className="text-sm font-medium text-foreground mb-2">Seu link de indicação:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-background rounded border text-sm">
                  {`${window.location.origin}/auth?ref=${profile?.referral_code}`}
                </code>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={copyReferralLink}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{referralCount}</div>
                <div className="text-sm text-muted-foreground">Indicações</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  R$ {(profile?.referral_earnings || 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Ganhos Totais</div>
              </div>
              <div>
                <Button size="sm" className="gradient-primary">
                  Solicitar Saque
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as seções mais populares
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2">
              <Star className="w-6 h-6 text-primary" />
              <span>Tutoriais</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2">
              <Gem className="w-6 h-6 text-primary" />
              <span>Ferramentas</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2">
              <Crown className="w-6 h-6 text-primary" />
              <span>Cursos</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span>Produtos</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};