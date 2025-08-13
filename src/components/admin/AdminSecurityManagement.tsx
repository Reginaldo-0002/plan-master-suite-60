import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Clock, Ban, AlertTriangle, Settings } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SecuritySettings {
  id: string;
  max_ips_per_user: number;
  block_duration_minutes: number;
  is_active: boolean;
}

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  session_start: string;
  session_end: string | null;
  duration_minutes: number;
  is_active: boolean;
  location_data: any;
  user_name: string;
}

interface AllUsersData {
  user_id: string;
  user_name: string;
  plan: string;
  last_session: string | null;
  total_sessions: number;
  unique_ips: number;
  total_time_minutes: number;
  is_currently_active: boolean;
  is_blocked: boolean;
}

interface SecurityBlock {
  id: string;
  user_id: string;
  block_reason: string;
  blocked_until: string;
  ip_count: number;
  blocked_by_system: boolean;
  created_at: string;
  is_active: boolean;
  user_name: string;
}

export const AdminSecurityManagement = () => {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [allUsers, setAllUsers] = useState<AllUsersData[]>([]);
  const [blocks, setBlocks] = useState<SecurityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const [newSettings, setNewSettings] = useState({
    max_ips_per_user: 3,
    block_duration_minutes: 60
  });

  useEffect(() => {
    loadSecurityData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(loadSecurityData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Carregar configurações de segurança
      const { data: settingsData, error: settingsError } = await supabase
        .from('security_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading settings:', settingsError);
      } else if (settingsData) {
        setSettings(settingsData);
        setNewSettings({
          max_ips_per_user: settingsData.max_ips_per_user,
          block_duration_minutes: settingsData.block_duration_minutes
        });
      }

      // Carregar sessões de usuários (últimas 24h)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('session_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('session_start', { ascending: false });

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
      } else {
        // Buscar nomes dos usuários separadamente
        const userIds = [...new Set(sessionsData?.map(s => s.user_id) || [])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

        const formattedSessions = sessionsData?.map(session => ({
          ...session,
          ip_address: String(session.ip_address),
          duration_minutes: session.duration_minutes || 0,
          user_name: profilesMap.get(session.user_id) || 'Usuário desconhecido'
        })) || [];
        setSessions(formattedSessions);
      }

      // Carregar bloqueios ativos
      const { data: blocksData, error: blocksError } = await supabase
        .from('user_security_blocks')
        .select('*')
        .eq('is_active', true)
        .gte('blocked_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (blocksError) {
        console.error('Error loading blocks:', blocksError);
      } else {
        // Buscar nomes dos usuários separadamente
        const userIds = [...new Set(blocksData?.map(b => b.user_id) || [])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

        const formattedBlocks = blocksData?.map(block => ({
          ...block,
          user_name: profilesMap.get(block.user_id) || 'Usuário desconhecido'
        })) || [];
        setBlocks(formattedBlocks);
      }

      // Carregar resumo de todos os usuários usando função otimizada
      const { data: allUsersStats, error: statsError } = await supabase
        .rpc('get_user_security_stats');

      if (statsError) {
        console.error('Error loading user stats:', statsError);
      } else {
        const formattedUsers = allUsersStats?.map(user => ({
          user_id: user.user_id,
          user_name: user.user_name,
          plan: user.user_plan,
          last_session: user.last_session_start,
          total_sessions: Number(user.total_sessions),
          unique_ips: Number(user.unique_ips),
          total_time_minutes: Number(user.total_time_minutes),
          is_currently_active: user.is_currently_active,
          is_blocked: user.is_blocked
        })) || [];
        setAllUsers(formattedUsers);
      }

    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de segurança",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySettings = async () => {
    try {
      setUpdating(true);

      // Desativar configuração atual
      if (settings) {
        await supabase
          .from('security_settings')
          .update({ is_active: false })
          .eq('id', settings.id);
      }

      // Criar nova configuração
      const { error } = await supabase
        .from('security_settings')
        .insert({
          max_ips_per_user: newSettings.max_ips_per_user,
          block_duration_minutes: newSettings.block_duration_minutes,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações de segurança atualizadas",
      });

      loadSecurityData();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const unblockUser = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('user_security_blocks')
        .update({ is_active: false })
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário desbloqueado",
      });

      loadSecurityData();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Erro",
        description: "Erro ao desbloquear usuário",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getSessionStatus = (session: UserSession) => {
    if (session.is_active) {
      return <Badge variant="default">Ativa</Badge>;
    }
    return <Badge variant="secondary">Finalizada</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Segurança do Sistema</h2>
        </div>
        <div className="text-center py-8">Carregando dados de segurança...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Segurança do Sistema</h2>
      </div>

      {/* Configurações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Segurança
          </CardTitle>
          <CardDescription>
            Configure os limites de segurança para o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_ips">Máximo de IPs por Usuário</Label>
              <Input
                id="max_ips"
                type="number"
                min="1"
                max="10"
                value={newSettings.max_ips_per_user}
                onChange={(e) => setNewSettings(prev => ({
                  ...prev,
                  max_ips_per_user: parseInt(e.target.value)
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block_duration">Duração do Bloqueio (minutos)</Label>
              <Input
                id="block_duration"
                type="number"
                min="5"
                max="1440"
                value={newSettings.block_duration_minutes}
                onChange={(e) => setNewSettings(prev => ({
                  ...prev,
                  block_duration_minutes: parseInt(e.target.value)
                }))}
              />
            </div>
          </div>
          <Button 
            onClick={updateSecuritySettings}
            disabled={updating}
            className="w-full md:w-auto"
          >
            {updating ? "Atualizando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Resumo de Todos os Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Resumo de Todos os Usuários
            <Badge variant="outline">{allUsers.length} usuários</Badge>
          </CardTitle>
          <CardDescription>
            Visão geral de atividade e segurança de todos os usuários cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Total Sessões</TableHead>
                    <TableHead>IPs Únicos</TableHead>
                    <TableHead>Tempo Total</TableHead>
                    <TableHead>Última Sessão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.user_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.plan === 'pro' ? 'default' : user.plan === 'vip' ? 'secondary' : 'outline'}>
                          {user.plan.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.total_sessions}</TableCell>
                      <TableCell>
                        <Badge variant={user.unique_ips > 3 ? 'destructive' : 'outline'}>
                          {user.unique_ips} IPs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatDuration(user.total_time_minutes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_session ? formatDateTime(user.last_session) : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : user.is_currently_active ? (
                          <Badge variant="default">Online</Badge>
                        ) : (
                          <Badge variant="secondary">Offline</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessões de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Sessões Ativas (Últimas 24h)
            <Badge variant="outline">{sessions.length} sessões</Badge>
          </CardTitle>
          <CardDescription>
            Monitoramento detalhado de sessões e IPs dos usuários - Atualização automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button 
              onClick={loadSecurityData}
              variant="outline"
              size="sm"
            >
              🔄 Atualizar Dados
            </Button>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sessão encontrada nas últimas 24 horas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.user_name}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded">
                          {session.ip_address}
                        </code>
                      </TableCell>
                      <TableCell>{formatDateTime(session.session_start)}</TableCell>
                      <TableCell>{formatDuration(session.duration_minutes)}</TableCell>
                      <TableCell>{getSessionStatus(session)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usuários Bloqueados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Usuários Bloqueados
          </CardTitle>
          <CardDescription>
            Usuários atualmente bloqueados por excesso de IPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário bloqueado no momento
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Bloqueado até</TableHead>
                    <TableHead>IPs Detectados</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-medium">
                        {block.user_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          {block.block_reason}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(block.blocked_until)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{block.ip_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unblockUser(block.id)}
                        >
                          Desbloquear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};