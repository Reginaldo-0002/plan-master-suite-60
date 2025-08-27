import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, Target, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";
import { useAreaTracking } from "@/hooks/useAreaTracking";
import { useTimeStats } from "@/hooks/useTimeStats";
import { useUserStats } from "@/hooks/useUserStats";
import { useSessionTimeTracking } from "@/hooks/useSessionTimeTracking";
import { useOptimizedQueries } from "@/hooks/useOptimizedQueries";
import { MagneticBackground } from "@/components/background/MagneticBackground";
import { Profile } from "@/types/profile";
import SessionInfo from "./SessionInfo";

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
  const { profile: realtimeProfile } = useProfileRealtime(user?.id);
  const { trackAreaAccess } = useAreaTracking();
  const { timeStats, formatTime } = useTimeStats();
  const { stats: userStats } = useUserStats();
  const { fetchWithErrorHandling } = useOptimizedQueries();
  
  // Start session time tracking
  useSessionTimeTracking();

  // Usar o perfil em tempo real se disponível, senão usar o perfil local
  const currentProfile = realtimeProfile || profile;

  // Memoizar dados para cache
  const memoizedData = useMemo(() => ({
    notifications,
    recentContent,
    referralStats
  }), [notifications, recentContent, referralStats]);

  useEffect(() => {
    if (user && isAuthenticated) {
      if (!realtimeProfile) {
        fetchProfile();
      }
      
      // Buscar dados em paralelo com cache
      Promise.all([
        fetchNotifications(),
        fetchRecentContent()
      ]);
      
      // Rastrear acesso ao dashboard
      trackAreaAccess('Dashboard');
    }
  }, [user, isAuthenticated, realtimeProfile, trackAreaAccess]);

  useEffect(() => {
    if (currentProfile) {
      fetchReferralStats();
    }
  }, [currentProfile]);

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
    const data = await fetchWithErrorHandling(
      async () => {
        const result = await supabase
          .from('notifications')
          .select('id, title, message, type, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        return { data: result.data, error: result.error };
      },
      'Erro ao carregar notificações'
    );
    
    if (data) {
      setNotifications(data);
    }
  };

  const fetchRecentContent = async () => {
    const data = await fetchWithErrorHandling(
      async () => {
        // Verificar usuário atual para debug
        const currentUser = await supabase.auth.getUser();
        console.log('👤 Current user ID for recent content:', currentUser.data.user?.id);
        
        const result = await supabase
          .from('content')
          .select('id, title, content_type, required_plan, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10); // Aumentar limite para compensar filtros
        
        // Filtrar manualmente conteúdo oculto para garantir
        let filteredData = result.data || [];
        
        if (currentUser.data.user?.id && result.data) {
          const { data: hiddenContent } = await supabase
            .from('content_visibility_rules')
            .select('content_id')
            .eq('user_id', currentUser.data.user.id)
            .eq('is_visible', false);
            
          const hiddenContentIds = hiddenContent?.map(rule => rule.content_id) || [];
          console.log('🚫 Hidden recent content IDs for user:', hiddenContentIds);
          
          // Filtrar conteúdo oculto e limitar a 3
          filteredData = filteredData.filter(item => !hiddenContentIds.includes(item.id)).slice(0, 3);
          
          console.log('✅ Recent content after manual filtering:', { 
            count: filteredData.length, 
            items: filteredData.map(item => ({ id: item.id, title: item.title }))
          });
        }
        
        return { data: filteredData, error: result.error };
      },
      'Erro ao carregar conteúdo'
    );
    
    if (data) {
      setRecentContent(data);
    }
  };

  const fetchReferralStats = async () => {
    if (!currentProfile) return;

    const data = await fetchWithErrorHandling(
      async () => {
        const result = await supabase
          .from('referrals')
          .select('bonus_amount')
          .eq('referrer_id', currentProfile.user_id);
        return { data: result.data, error: result.error };
      },
      'Erro ao carregar estatísticas de indicação'
    );
    
    if (data) {
      const count = data.length || 0;
      const earnings = data.reduce((sum: number, ref: any) => sum + (ref.bonus_amount || 0), 0) || 0;
      setReferralStats({ count, earnings });
    }
  };

  const copyReferralCode = () => {
    if (currentProfile?.referral_code) {
      navigator.clipboard.writeText(currentProfile.referral_code);
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


  if (!currentProfile) {
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
              Bem-vindo, {currentProfile.full_name || 'Usuário'}!
            </h2>
            <p className="text-muted-foreground">
              Aqui está um resumo da sua atividade na plataforma
            </p>
          </div>
          <Badge className={getPlanBadgeColor(currentProfile.plan)}>
            Plano {currentProfile.plan.toUpperCase()}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20 hover:shadow-lg hover:shadow-futuristic-primary/20 transition-all duration-300 animate-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Hoje</CardTitle>
              <Clock className="h-4 w-4 text-futuristic-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-electric">
                {timeStats ? formatTime(timeStats.today_minutes) : '0m'}
              </div>
              <p className="text-xs text-muted-foreground">hoje na plataforma</p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20 hover:shadow-lg hover:shadow-futuristic-accent/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Áreas Acessadas</CardTitle>
              <Target className="h-4 w-4 text-futuristic-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-accent">{userStats.areas_accessed}</div>
              <p className="text-xs text-muted-foreground">diferentes seções</p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-secondary/20 hover:shadow-lg hover:shadow-futuristic-secondary/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indicações</CardTitle>
              <Users className="h-4 w-4 text-futuristic-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-secondary">{userStats.total_referrals}</div>
              <p className="text-xs text-muted-foreground">usuários indicados</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-neon/20 hover:shadow-lg hover:shadow-futuristic-neon/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
              <Clock className="h-4 w-4 text-futuristic-neon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-futuristic-neon">
                {timeStats ? formatTime(timeStats.year_minutes) : '0m'}
              </div>
              <p className="text-xs text-muted-foreground">este ano</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Period Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
            <CardHeader>
              <CardTitle className="text-futuristic-primary flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-futuristic-primary">
                {timeStats ? formatTime(timeStats.week_minutes) : '0m'}
              </div>
              <p className="text-muted-foreground">nesta semana</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20">
            <CardHeader>
              <CardTitle className="text-futuristic-accent flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-futuristic-accent">
                {timeStats ? formatTime(timeStats.month_minutes) : '0m'}
              </div>
              <p className="text-muted-foreground">neste mês</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-secondary/20">
            <CardHeader>
              <CardTitle className="text-futuristic-secondary flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-futuristic-secondary">
                {timeStats ? formatTime(timeStats.year_minutes) : '0m'}
              </div>
              <p className="text-muted-foreground">neste ano</p>
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
                <p className="text-lg font-mono font-bold text-futuristic-primary">{currentProfile.referral_code}</p>
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

        {/* Session Info */}
        <SessionInfo />

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