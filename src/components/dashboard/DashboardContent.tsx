import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { useTimeStats } from '@/hooks/useTimeStats';
import { useAreasAccessedStats } from '@/hooks/useAreasAccessedStats';
import { useReferralStats } from '@/hooks/useReferralStats';
import { OptimizedLoader } from '@/components/optimized/OptimizedLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MagneticBackground } from '@/components/background/MagneticBackground';
import { Clock, Target, Users, Gift, Calendar, TrendingUp } from 'lucide-react';
import SessionInfo from './SessionInfo';


interface DashboardContentProps {
  onContentSelect?: (contentId: string) => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ onContentSelect }) => {
  const { user, isAuthenticated } = useAuth();
  const { 
    dashboardData, 
    recentContents, 
    activeNotifications,
    isLoading: dashboardLoading
  } = useOptimizedDashboard(user?.id);

  // Real-time hooks for dashboard stats
  const { timeStats, loading: timeLoading, formatTime } = useTimeStats();
  const { areasAccessed, loading: areasLoading } = useAreasAccessedStats();  
  const { referralStats, loading: referralLoading } = useReferralStats();

  const profile = dashboardData?.profile;
  const isStatsLoading = timeLoading || areasLoading || referralLoading;

  // Memoized main stats cards (primeira linha)
  const mainStatsCards = useMemo(() => [
    {
      title: "Tempo Hoje",
      value: timeStats ? formatTime(timeStats.today_minutes) : '0m',
      description: "hoje na plataforma",
      icon: Clock,
      color: "text-futuristic-primary"
    },
    {
      title: "Áreas Acessadas", 
      value: areasAccessed.toString(),
      description: "diferentes seções",
      icon: Target,
      color: "text-futuristic-accent"
    },
    {
      title: "Indicações",
      value: referralStats.total_referrals.toString(),
      description: "usuários indicados",
      icon: Users,
      color: "text-futuristic-secondary"
    },
    {
      title: "Tempo Total",
      value: timeStats ? formatTime(timeStats.year_minutes) : '0m',
      description: "este ano",
      icon: Gift,
      color: "text-futuristic-neon"
    }
  ], [timeStats, areasAccessed, referralStats, formatTime]);

  // Memoized time stats cards (segunda linha)
  const timeStatsCards = useMemo(() => [
    {
      title: "Tempo Semanal",
      value: timeStats ? formatTime(timeStats.week_minutes) : '0m',
      description: "nesta semana",
      icon: Calendar,
      color: "text-futuristic-primary"
    },
    {
      title: "Tempo Mensal",
      value: timeStats ? formatTime(timeStats.month_minutes) : '0m',
      description: "neste mês",
      icon: TrendingUp,
      color: "text-futuristic-accent"
    },
    {
      title: "Tempo Anual",
      value: timeStats ? formatTime(timeStats.year_minutes) : '0m',
      description: "neste ano",
      icon: Clock,
      color: "text-futuristic-neon"
    }
  ], [timeStats, formatTime]);

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white'; 
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  if (!isAuthenticated || !profile || dashboardLoading || isStatsLoading) {
    return (
      <>
        <MagneticBackground />
        <div className="flex-1 space-y-8 p-8 relative z-10">
          <OptimizedLoader type="dashboard" />
        </div>
      </>
    );
  }

  return (
    <>
      <MagneticBackground />
      <div className="flex-1 space-y-8 p-8 relative z-10">
        {/* Header Section */}
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

        {/* Main Stats Cards - Primeira linha */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mainStatsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Time Stats Cards - Segunda linha */}
        <div className="grid gap-4 md:grid-cols-3">
          {timeStatsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Content & Notifications */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20">
            <CardHeader>
              <CardTitle className="text-futuristic-accent">Conteúdo Recente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentContents.slice(0, 3).map((content: any) => (
                <div 
                  key={content.id} 
                  className="flex items-center justify-between p-3 border border-futuristic-primary/20 rounded-lg bg-background/20 hover:bg-background/40 transition-colors cursor-pointer"
                  onClick={() => onContentSelect?.(content.id)}
                >
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
            </CardHeader>
            <CardContent className="space-y-4">
              {activeNotifications.slice(0, 3).map((notification: any) => (
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

        {/* Session Information and Referral Program */}
        <div className="grid gap-4 md:grid-cols-2">
          <SessionInfo />
          
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-futuristic-primary" />
                Programa de Indicação
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compartilhe seu código e ganhe R$ {referralStats.referral_earnings.toFixed(2)} com suas indicações
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Seu código de indicação:</p>
                <div className="flex items-center justify-between p-3 bg-background/20 rounded-lg border">
                  <code className="text-futuristic-primary font-mono text-lg">
                    {profile?.referral_code || 'Carregando...'}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (profile?.referral_code) {
                        navigator.clipboard.writeText(profile.referral_code);
                      }
                    }}
                  >
                    Copiar Código
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ganhos totais:</span>
                <span className="text-lg font-bold text-futuristic-secondary">
                  R$ {referralStats.referral_earnings.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </>
  );
};