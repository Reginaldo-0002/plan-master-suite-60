
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Clock, Target, Gift, Eye } from "lucide-react";
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
  const [notifications, setNotifications] = useState([]);
  const [recentContent, setRecentContent] = useState([]);
  const [referralStats, setReferralStats] = useState({ count: 0, earnings: 0 });
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      fetchRecentContent();
      fetchReferralStats();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchRecentContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecentContent(data || []);
    } catch (error) {
      console.error('Error fetching recent content:', error);
    }
  };

  const fetchReferralStats = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', profile.id);

      if (error) throw error;
      
      const count = data?.length || 0;
      const earnings = data?.reduce((sum: number, ref: any) => sum + (ref.bonus_amount || 0), 0) || 0;
      
      setReferralStats({ count, earnings });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: "Código copiado!",
        description: "Seu código de indicação foi copiado para a área de transferência",
      });
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!profile) {
    return (
      <div className="flex-1 space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Carregando...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Bem-vindo, {profile.full_name || 'Usuário'}!
          </h2>
          <p className="text-muted-foreground">
            Aqui está um resumo da sua atividade na plataforma
          </p>
        </div>
        <Badge className={getPlanBadgeColor(profile.plan)}>
          Plano {profile.plan.toUpperCase()}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(profile.total_session_time || 0)}</div>
            <p className="text-xs text-muted-foreground">
              na plataforma
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas Acessadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.areas_accessed || 0}</div>
            <p className="text-xs text-muted-foreground">
              diferentes seções
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indicações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.count}</div>
            <p className="text-xs text-muted-foreground">
              usuários indicados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(profile.referral_earnings || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              em indicações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Programa de Indicação
          </CardTitle>
          <CardDescription>
            Compartilhe seu código e ganhe com cada nova indicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Seu código de indicação:</p>
              <p className="text-lg font-mono font-bold text-primary">{profile.referral_code}</p>
            </div>
            <Button onClick={copyReferralCode}>
              Copiar Código
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Content & Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conteúdo Recente</CardTitle>
            <CardDescription>
              Últimos conteúdos adicionados à plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentContent.slice(0, 3).map((content: any) => (
              <div key={content.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{content.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {content.content_type}
                  </p>
                </div>
                <Badge className={getPlanBadgeColor(content.required_plan)}>
                  {content.required_plan.toUpperCase()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              Últimas atualizações e avisos importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.slice(0, 3).map((notification: any) => (
              <div key={notification.id} className="border-l-4 border-primary pl-4">
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
