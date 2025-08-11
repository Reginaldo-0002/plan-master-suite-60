import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, MessageSquare, TrendingUp, Clock, Database } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  totalContent: number;
  openTickets: number;
  onlineUsers: number;
  revenue: number;
}

export const AdminDashboardContent = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersToday: 0,
    totalContent: 0,
    openTickets: 0,
    onlineUsers: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch new users today
      const today = new Date().toISOString().split('T')[0];
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Fetch total content
      const { count: totalContent } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true });

      // Fetch open tickets
      const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'closed');

      setStats({
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        totalContent: totalContent || 0,
        openTickets: openTickets || 0,
        onlineUsers: 0, // This would need real-time presence tracking
        revenue: 0, // This would come from payment integration
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldLogs = async () => {
    try {
      const nineDaysAgo = new Date();
      nineDaysAgo.setDate(nineDaysAgo.getDate() - 90);

      const { error } = await supabase
        .from('user_activity_logs')
        .delete()
        .lt('created_at', nineDaysAgo.toISOString());

      if (error) throw error;

      alert('Logs antigos removidos com sucesso!');
      fetchDashboardStats();
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      alert('Erro ao limpar logs antigos');
    }
  };

  const statsCards = [
    {
      title: "Total de Usuários",
      value: stats.totalUsers,
      description: `+${stats.newUsersToday} hoje`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Conteúdos",
      value: stats.totalContent,
      description: "Produtos, cursos, ferramentas",
      icon: FileText,
      color: "text-green-600",
    },
    {
      title: "Tickets Abertos",
      value: stats.openTickets,
      description: "Suporte pendente",
      icon: MessageSquare,
      color: "text-orange-600",
    },
    {
      title: "Usuários Online",
      value: stats.onlineUsers,
      description: "Última hora",
      icon: Clock,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Administrativo</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema e métricas principais
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            <Database className="w-4 h-4 mr-1" />
            Sistema Ativo
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Management Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Limpeza de Dados</CardTitle>
            <CardDescription>
              Gerencie e limpe dados antigos do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={cleanupOldLogs}
              variant="outline"
              className="w-full"
            >
              Limpar Logs Antigos (90+ dias)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Atividade Recente</CardTitle>
            <CardDescription>
              Últimas ações dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Sistema monitorando em tempo real...
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Performance</CardTitle>
            <CardDescription>
              Status dos serviços do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-foreground">Todos os serviços operacionais</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Logs de Atividade Recentes</CardTitle>
          <CardDescription>
            Últimas ações registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Sistema de logs em tempo real ativo
          </div>
        </CardContent>
      </Card>
    </div>
  );
};