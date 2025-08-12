import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, Target, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MagneticBackground } from "@/components/background/MagneticBackground";
import { Profile } from "@/types/profile";

interface DashboardContentProps {
  onContentSelect?: (contentId: string) => void;
}

export const DashboardContent = ({ onContentSelect }: DashboardContentProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState([]);
  const [recentContent, setRecentContent] = useState([]);
  const [referralStats, setReferralStats] = useState({ count: 0, earnings: 0 });
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (user && isAuthenticated) {
      fetchProfile();
      fetchNotifications();
      fetchRecentContent();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (profile) {
      fetchReferralStats();
    }
  }, [profile]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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
        .eq('referrer_id', profile.user_id);

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
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!profile) {
    return (
      <>
        <MagneticBackground />
        <div className="flex-1 space-y-8 p-8 relative z-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Carregando...</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MagneticBackground />
      <div className="flex-1 space-y-8 p-8 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-futuristic-primary to-futuristic-secondary bg-clip-text text-transparent">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20 hover:shadow-lg hover:shadow-futuristic-primary/20 transition-all duration-300 animate-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
              <Clock className="h-4 w-4 text-futuristic-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-electric">{formatTime(profile.total_session_time || 0)}</div>
              <p className="text-xs text-muted-foreground">
                na plataforma
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20 hover:shadow-lg hover:shadow-futuristic-accent/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Áreas Acessadas</CardTitle>
              <Target className="h-4 w-4 text-futuristic-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-accent">{profile.areas_accessed || 0}</div>
              <p className="text-xs text-muted-foreground">
                diferentes seções
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-secondary/20 hover:shadow-lg hover:shadow-futuristic-secondary/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indicações</CardTitle>
              <Users className="h-4 w-4 text-futuristic-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-secondary">{referralStats.count}</div>
              <p className="text-xs text-muted-foreground">
                usuários indicados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Program */}
        <Card className="bg-gradient-to-br from-futuristic-primary/10 to-futuristic-secondary/10 border-futuristic-primary/20 shadow-lg backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-futuristic-primary">
              <Gift className="h-5 w-5" />
              Programa de Indicação
            </CardTitle>
            <CardDescription>
              Compartilhe seu código e ganhe R$ {referralStats.earnings.toFixed(2)} com suas indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-futuristic-primary/30 rounded-lg bg-background/30 backdrop-blur-xs">
              <div>
                <p className="font-medium">Seu código de indicação:</p>
                <p className="text-lg font-mono font-bold text-futuristic-primary">{profile.referral_code}</p>
                <p className="text-sm text-muted-foreground">
                  Ganhos totais: R$ {referralStats.earnings.toFixed(2)}
                </p>
              </div>
              <Button onClick={copyReferralCode} className="bg-futuristic-gradient hover:opacity-90">
                Copiar Código
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Content & Notifications */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20">
            <CardHeader>
              <CardTitle className="text-futuristic-accent">Conteúdo Recente</CardTitle>
              <CardDescription>
                Últimos conteúdos adicionados à plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentContent.slice(0, 3).map((content: any) => (
                <div key={content.id} className="flex items-center justify-between p-3 border border-futuristic-primary/20 rounded-lg bg-background/20 hover:bg-background/40 transition-colors cursor-pointer"
                     onClick={() => onContentSelect?.(content.id)}>
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

          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-neon/20">
            <CardHeader>
              <CardTitle className="text-futuristic-neon">Notificações</CardTitle>
              <CardDescription>
                Últimas atualizações e avisos importantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.slice(0, 3).map((notification: any) => (
                <div key={notification.id} className="border-l-4 border-futuristic-primary pl-4 p-3 bg-background/20 rounded-r-lg">
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
    </>
  );
};