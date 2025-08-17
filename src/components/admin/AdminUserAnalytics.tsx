import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserStat {
  user_id: string;
  user_name: string;
  user_plan: string;
  total_areas_accessed: number;
  total_referrals: number;
  today_minutes: number;
  week_minutes: number;
  month_minutes: number;
  year_minutes: number;
  last_activity: string;
}

export const AdminUserAnalytics = () => {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      
      // Buscar perfis dos usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Para cada usuário, buscar estatísticas
      const statsPromises = (profiles || []).map(async (profile) => {
        // Buscar áreas acessadas
        const { data: areas } = await supabase
          .from('user_area_tracking')
          .select('area_name')
          .eq('user_id', profile.user_id);

        const uniqueAreas = new Set(areas?.map(item => item.area_name) || []);

        // Buscar indicações
        const { data: referrals } = await supabase
          .from('referrals')
          .select('id')
          .eq('referrer_id', profile.user_id);

        // Buscar estatísticas de tempo usando a função RPC
        const { data: timeStats } = await supabase.rpc('get_time_stats', {
          target_user_id: profile.user_id
        });

        const stats = timeStats?.[0] || {
          today_minutes: 0,
          week_minutes: 0,
          month_minutes: 0,
          year_minutes: 0
        };

        return {
          user_id: profile.user_id,
          user_name: profile.full_name || 'Usuário sem nome',
          user_plan: profile.plan || 'free',
          total_areas_accessed: uniqueAreas.size,
          total_referrals: referrals?.length || 0,
          today_minutes: stats.today_minutes || 0,
          week_minutes: stats.week_minutes || 0,
          month_minutes: stats.month_minutes || 0,
          year_minutes: stats.year_minutes || 0,
          last_activity: profile.last_activity
        };
      });

      const userStatsData = await Promise.all(statsPromises);
      setUserStats(userStatsData);
      
      console.log('✅ User stats loaded:', userStatsData);
    } catch (error: any) {
      console.error('❌ Error fetching user stats:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas dos usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();

    // Subscrever mudanças em tempo real
    const channel = supabase
      .channel('admin-user-stats-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_time_sessions' 
      }, () => {
        console.log('📊 Time session changed, refreshing stats...');
        fetchUserStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_area_tracking' 
      }, () => {
        console.log('📍 Area tracking changed, refreshing stats...');
        fetchUserStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'referrals' 
      }, () => {
        console.log('👥 Referral changed, refreshing stats...');
        fetchUserStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        console.log('👤 Profile changed, refreshing stats...');
        fetchUserStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const totalStats = userStats.reduce((acc, user) => ({
    totalUsers: acc.totalUsers + 1,
    totalMinutesToday: acc.totalMinutesToday + user.today_minutes,
    totalMinutesWeek: acc.totalMinutesWeek + user.week_minutes,
    totalMinutesMonth: acc.totalMinutesMonth + user.month_minutes,
    totalMinutesYear: acc.totalMinutesYear + user.year_minutes,
    totalAreas: acc.totalAreas + user.total_areas_accessed,
    totalReferrals: acc.totalReferrals + user.total_referrals,
  }), {
    totalUsers: 0,
    totalMinutesToday: 0,
    totalMinutesWeek: 0,
    totalMinutesMonth: 0,
    totalMinutesYear: 0,
    totalAreas: 0,
    totalReferrals: 0,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Analytics dos Usuários</h2>
        </div>
        <div className="text-center">Carregando estatísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Analytics dos Usuários</h2>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalStats.totalMinutesToday)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas Acessadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalAreas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Indicações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalReferrals}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="time">Tempo por Período</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Gerais dos Usuários</CardTitle>
              <CardDescription>
                Visão geral de todos os usuários da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Áreas</TableHead>
                    <TableHead>Indicações</TableHead>
                    <TableHead>Tempo Hoje</TableHead>
                    <TableHead>Última Atividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.user_name}</TableCell>
                      <TableCell>
                        <Badge className={getPlanBadgeColor(user.user_plan)}>
                          {user.user_plan.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.total_areas_accessed}</TableCell>
                      <TableCell>{user.total_referrals}</TableCell>
                      <TableCell>{formatTime(user.today_minutes)}</TableCell>
                      <TableCell>
                        {user.last_activity ? new Date(user.last_activity).toLocaleDateString('pt-BR') : 'Nunca'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle>Tempo na Plataforma por Período</CardTitle>
              <CardDescription>
                Detalhamento do tempo gasto por usuário em diferentes períodos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Hoje</TableHead>
                    <TableHead>Esta Semana</TableHead>
                    <TableHead>Este Mês</TableHead>
                    <TableHead>Este Ano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.user_name}</TableCell>
                      <TableCell>{formatTime(user.today_minutes)}</TableCell>
                      <TableCell>{formatTime(user.week_minutes)}</TableCell>
                      <TableCell>{formatTime(user.month_minutes)}</TableCell>
                      <TableCell>{formatTime(user.year_minutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Engajamento dos Usuários</CardTitle>
              <CardDescription>
                Métricas de engajamento e atividade dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Áreas Acessadas</TableHead>
                    <TableHead>Usuários Indicados</TableHead>
                    <TableHead>Tempo Total (Ano)</TableHead>
                    <TableHead>Engajamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats
                    .sort((a, b) => (b.year_minutes + b.total_areas_accessed * 10 + b.total_referrals * 20) - 
                                   (a.year_minutes + a.total_areas_accessed * 10 + a.total_referrals * 20))
                    .map((user) => {
                      const engagementScore = user.year_minutes + (user.total_areas_accessed * 10) + (user.total_referrals * 20);
                      let engagementLevel = 'Baixo';
                      if (engagementScore > 100) engagementLevel = 'Alto';
                      else if (engagementScore > 50) engagementLevel = 'Médio';

                      return (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">{user.user_name}</TableCell>
                          <TableCell>
                            <Badge className={getPlanBadgeColor(user.user_plan)}>
                              {user.user_plan.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.total_areas_accessed}</TableCell>
                          <TableCell>{user.total_referrals}</TableCell>
                          <TableCell>{formatTime(user.year_minutes)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              engagementLevel === 'Alto' ? 'default' : 
                              engagementLevel === 'Médio' ? 'secondary' : 'outline'
                            }>
                              {engagementLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};