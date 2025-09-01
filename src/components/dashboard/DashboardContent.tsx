import React, { useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { OptimizedLoader } from '@/components/optimized/OptimizedLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MagneticBackground } from '@/components/background/MagneticBackground';
import { Clock, Target, Users, Gift } from 'lucide-react';

// Lazy load sections for better performance
const CarouselSection = lazy(() => import('./CarouselSection').then(module => ({ default: module.CarouselSection })));
const ContentSection = lazy(() => import('./ContentSection').then(module => ({ default: module.ContentSection })));
const PlansSection = lazy(() => import('./PlansSection').then(module => ({ default: module.PlansSection })));
const ReferralSystem = lazy(() => import('./ReferralSystem').then(module => ({ default: module.ReferralSystem })));
const RulesSection = lazy(() => import('./RulesSection').then(module => ({ default: module.RulesSection })));
const ComingSoonSection = lazy(() => import('./ComingSoonSection').then(module => ({ default: module.ComingSoonSection })));

interface DashboardContentProps {
  onContentSelect?: (contentId: string) => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ onContentSelect }) => {
  const { profile, user, isAuthenticated } = useAuth();
  const { 
    dashboardData, 
    recentContents, 
    activeNotifications,
    isLoading
  } = useOptimizedDashboard(user?.id);

  // Memoized stats cards for performance
  const statsCards = useMemo(() => [
    {
      title: "Tempo Total",
      value: `${Math.floor(dashboardData.userStats.totalSessions / 60)}h ${dashboardData.userStats.totalSessions % 60}m`,
      description: "Tempo de sessão acumulado",
      icon: Clock,
      color: "text-futuristic-primary"
    },
    {
      title: "Áreas Acessadas", 
      value: dashboardData.userStats.areasAccessed.toString(),
      description: "Diferentes seções visitadas",
      icon: Target,
      color: "text-futuristic-accent"
    },
    {
      title: "Indicações",
      value: profile?.total_points?.toString() || '0',
      description: "Usuários indicados",
      icon: Users,
      color: "text-futuristic-secondary"
    },
    {
      title: "Plano Atual",
      value: profile?.plan?.toUpperCase() || 'FREE',
      description: "Seu plano de assinatura",
      icon: Gift,
      color: "text-futuristic-neon"
    }
  ], [dashboardData.userStats, profile]);

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white'; 
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  if (!isAuthenticated || !profile || isLoading) {
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => {
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

        {/* Lazy Loaded Sections */}
        <Suspense fallback={<OptimizedLoader type="content" count={3} />}>
          <CarouselSection />
        </Suspense>
        
        <Suspense fallback={<OptimizedLoader type="content" count={3} />}>
          <ContentSection />
        </Suspense>
        
        <Suspense fallback={<OptimizedLoader type="content" count={2} />}>
          <PlansSection />
        </Suspense>
        
        <Suspense fallback={<OptimizedLoader type="content" count={1} />}>
          <ReferralSystem />
        </Suspense>
        
        <Suspense fallback={<OptimizedLoader type="content" count={1} />}>
          <RulesSection />
        </Suspense>
        
        <Suspense fallback={<OptimizedLoader type="content" count={2} />}>
          <ComingSoonSection />
        </Suspense>
      </div>
    </>
  );
};