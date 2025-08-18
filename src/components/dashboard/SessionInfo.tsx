import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe, Monitor, MapPin, Users, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTimeStats } from "@/hooks/useTimeStats";
import { useAreasAccessedStats } from "@/hooks/useAreasAccessedStats";
import { useReferralStats } from "@/hooks/useReferralStats";

interface SessionData {
  ip_address: string | null;
  user_agent: string;
  session_start: string;
  duration_minutes: number;
  is_active: boolean;
}

const SessionInfo = () => {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { timeStats, formatTime } = useTimeStats();
  const { areasAccessed } = useAreasAccessedStats();
  const { referralStats } = useReferralStats();

  useEffect(() => {
    // Atualizar horário em tempo real
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSessionData = async () => {
      try {
        const { data, error } = await supabase
          .from('user_sessions')
          .select('ip_address, user_agent, session_start, duration_minutes, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('session_start', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar dados da sessão:', error);
          return;
        }

        if (data) {
          setSessionData(data as SessionData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados da sessão:', error);
      }
    };

    fetchSessionData();

    // Configurar listener de realtime para atualizações de sessão
    const channel = supabase
      .channel('session_info_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Session update received:', payload);
          if (payload.new && (payload.new as any).is_active) {
            setSessionData(payload.new as SessionData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatUserAgent = (userAgent: string) => {
    // Extrair informações básicas do navegador
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    return 'Navegador desconhecido';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card className="shadow-card border-card-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          Informações da Sessão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas de Tempo */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-sm font-medium">{timeStats ? formatTime(timeStats.today_minutes) : '0m'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Semana</p>
              <p className="text-sm font-medium">{timeStats ? formatTime(timeStats.week_minutes) : '0m'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Mês</p>
              <p className="text-sm font-medium">{timeStats ? formatTime(timeStats.month_minutes) : '0m'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Ano</p>
              <p className="text-sm font-medium">{timeStats ? formatTime(timeStats.year_minutes) : '0m'}</p>
            </div>
          </div>
        </div>

        {/* Estatísticas de Atividade */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Áreas Acessadas</p>
              <p className="text-sm font-medium">{areasAccessed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <div>
              <p className="text-xs text-muted-foreground">Indicações</p>
              <p className="text-sm font-medium">{referralStats.total_referrals}</p>
            </div>
          </div>
        </div>

        {/* Horário atual */}
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Horário Atual</p>
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                dateStyle: 'short',
                timeStyle: 'medium'
              })}
            </p>
          </div>
        </div>

        {/* IP Address */}
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Endereço IP</p>
            <p className="text-sm text-muted-foreground font-mono">
              {sessionData?.ip_address || 'Carregando...'}
            </p>
          </div>
        </div>

        {/* Navegador */}
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Navegador</p>
            <p className="text-sm text-muted-foreground">
              {sessionData ? formatUserAgent(sessionData.user_agent) : 'Carregando...'}
            </p>
          </div>
        </div>

        {/* Status da sessão */}
        {sessionData && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={sessionData.is_active ? "default" : "secondary"}>
                {sessionData.is_active ? "Online" : "Offline"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Início da Sessão</span>
              <span className="text-sm text-muted-foreground">
                {new Date(sessionData.session_start).toLocaleString('pt-BR', {
                  timeStyle: 'short',
                  dateStyle: 'short'
                })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tempo Online</span>
              <span className="text-sm text-muted-foreground">
                {sessionData.is_active && sessionData.session_start 
                  ? formatDuration(Math.max(sessionData.duration_minutes, Math.floor((Date.now() - new Date(sessionData.session_start).getTime()) / 1000 / 60)))
                  : formatDuration(sessionData.duration_minutes)
                }
              </span>
            </div>
          </>
        )}

        {!sessionData && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Carregando informações da sessão...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionInfo;