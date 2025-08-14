
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Bell,
  FileText,
  MessageSquare,
  Activity,
  Shield
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  totalContent: number;
  activeContent: number;
  openTickets: number;
  activeNotifications: number;
}

export const AdminDashboardContent = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalEarnings: 0,
    pendingWithdrawals: 0,
    totalContent: 0,
    activeContent: 0,
    openTickets: 0,
    activeNotifications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    
    // Set up real-time updates
    const channels = [
      supabase.channel('dashboard-profiles').on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles'
      }, fetchDashboardStats),
      
      supabase.channel('dashboard-content').on('postgres_changes', {
        event: '*', schema: 'public', table: 'content'
      }, fetchDashboardStats),
      
      supabase.channel('dashboard-tickets').on('postgres_changes', {
        event: '*', schema: 'public', table: 'support_tickets'
      }, fetchDashboardStats),
      
      supabase.channel('dashboard-withdrawals').on('postgres_changes', {
        event: '*', schema: 'public', table: 'withdrawal_requests'
      }, fetchDashboardStats),
      
      supabase.channel('dashboard-notifications').on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications'
      }, fetchDashboardStats)
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        profilesResult,
        contentResult,
        ticketsResult,
        withdrawalsResult,
        notificationsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('content').select('*'),
        supabase.from('support_tickets').select('*'),
        supabase.from('withdrawal_requests').select('*'),
        supabase.from('notifications').select('*')
      ]);

      const profiles = profilesResult.data || [];
      const content = contentResult.data || [];
      const tickets = ticketsResult.data || [];
      const withdrawals = withdrawalsResult.data || [];
      const notifications = notificationsResult.data || [];

      // Calculate earnings
      const totalEarnings = profiles.reduce((sum, profile) => 
        sum + (Number(profile.referral_earnings) || 0), 0
      );

      const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;

      setStats({
        totalUsers: profiles.length,
        activeUsers: profiles.filter(p => p.plan !== 'free').length,
        totalEarnings,
        pendingWithdrawals,
        totalContent: content.length,
        activeContent: content.filter(c => c.is_active).length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        activeNotifications: notifications.filter(n => n.is_active).length
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total de Usuários",
      value: stats.totalUsers,
      description: `${stats.activeUsers} usuários pagantes`,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Ganhos Totais",
      value: `R$ ${stats.totalEarnings.toFixed(2)}`,
      description: `${stats.pendingWithdrawals} saques pendentes`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Conteúdos",
      value: stats.totalContent,
      description: `${stats.activeContent} ativos`,
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "Tickets Abertos",
      value: stats.openTickets,
      description: "Suporte necessário",
      icon: MessageSquare,
      color: "text-yellow-600"
    },
    {
      title: "Notificações Ativas",
      value: stats.activeNotifications,
      description: "Sendo exibidas",
      icon: Bell,
      color: "text-red-600"
    },
    {
      title: "Taxa de Conversão",
      value: stats.totalUsers > 0 ? `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%` : "0%",
      description: "Free para Pago",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Administrativo</h2>
          <p className="text-muted-foreground">
            Visão geral da plataforma e métricas principais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <div className="text-sm font-medium text-foreground">Sistema Seguro</div>
            <div className="text-xs text-muted-foreground">RLS Ativo</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {card.description}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Últimas atividades na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Usuários cadastrados</div>
                  <div className="text-xs text-muted-foreground">{stats.totalUsers} usuários no sistema</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Programa de Afiliados</div>
                  <div className="text-xs text-muted-foreground">R$ {stats.totalEarnings.toFixed(2)} em comissões</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <MessageSquare className="w-4 h-4 text-yellow-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Tickets de suporte</div>
                  <div className="text-xs text-muted-foreground">{stats.openTickets} tickets em aberto</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Status do Sistema
            </CardTitle>
            <CardDescription>
              Saúde e segurança da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">Banco de Dados</div>
                  <div className="text-xs text-muted-foreground">Supabase RLS</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">Autenticação</div>
                  <div className="text-xs text-muted-foreground">JWT + RLS</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">Tempo Real</div>
                  <div className="text-xs text-muted-foreground">WebSockets</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
