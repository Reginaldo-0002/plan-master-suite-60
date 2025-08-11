
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  BookOpen, 
  MessageSquare, 
  Bell,
  Gift,
  Crown,
  Zap
} from "lucide-react";
import { ContentSection } from "./ContentSection";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  plan: string;
  referral_code: string;
  referral_earnings: number;
  total_session_time: number;
  areas_accessed: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

export const DashboardContent = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'content' | 'referrals'>('overview');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
    fetchNotifications();
    
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, fetchUserData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
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

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'vip': return <Crown className="w-4 h-4" />;
      case 'pro': return <Zap className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const copyReferralLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de indicação foi copiado para a área de transferência",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground">
        Erro ao carregar dados do usuário
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Olá, {profile.full_name || "Usuário"}!
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta à sua plataforma
          </p>
        </div>
        <Badge className={getPlanBadgeColor(profile.plan)}>
          <div className="flex items-center gap-1">
            {getPlanIcon(profile.plan)}
            Plano {profile.plan.toUpperCase()}
          </div>
        </Badge>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeSection === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveSection('overview')}
        >
          Visão Geral
        </Button>
        <Button
          variant={activeSection === 'content' ? 'default' : 'outline'}
          onClick={() => setActiveSection('content')}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Conteúdos
        </Button>
        <Button
          variant={activeSection === 'referrals' ? 'default' : 'outline'}
          onClick={() => setActiveSection('referrals')}
        >
          <Gift className="w-4 h-4 mr-2" />
          Indicações
        </Button>
      </div>

      {/* Content Sections */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ganhos Totais
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  R$ {profile.referral_earnings.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Através de indicações
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tempo Online
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {Math.floor(profile.total_session_time / 60)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Total na plataforma
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Áreas Acessadas
                </CardTitle>
                <BookOpen className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {profile.areas_accessed}
                </div>
                <p className="text-xs text-muted-foreground">
                  Diferentes seções
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Seu Plano
                </CardTitle>
                {getPlanIcon(profile.plan)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {profile.plan.toUpperCase()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Acesso a recursos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações Recentes
                </CardTitle>
                <CardDescription>
                  Fique por dentro das novidades da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <Bell className="w-4 h-4 mt-1 text-primary" />
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSection === 'content' && (
        <ContentSection userPlan={profile.plan} />
      )}

      {activeSection === 'referrals' && (
        <div className="space-y-8">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Programa de Indicações
              </CardTitle>
              <CardDescription>
                Ganhe comissões indicando novos usuários para a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Seus Ganhos</h3>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {profile.referral_earnings.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total acumulado em comissões
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Seu Código</h3>
                  <div className="text-2xl font-bold text-primary">
                    {profile.referral_code}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Código único para suas indicações
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Link de Indicação</h3>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-muted rounded text-sm text-muted-foreground">
                    {window.location.origin}?ref={profile.referral_code}
                  </div>
                  <Button onClick={copyReferralLink} variant="outline">
                    Copiar Link
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Como Funciona</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Compartilhe seu link de indicação</li>
                  <li>• Ganhe 10% de comissão sobre vendas de indicados</li>
                  <li>• Saque mínimo de R$ 50,00</li>
                  <li>• Pagamentos via PIX em até 48h</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
