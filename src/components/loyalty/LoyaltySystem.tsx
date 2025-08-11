
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Gift, Star, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoyaltyData {
  points: number;
  level: string;
  total_earned: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_description: string;
  points_awarded: number;
  unlocked_at: string;
}

interface Mission {
  id: string;
  mission_description: string;
  target_value: number;
  current_progress: number;
  points_reward: number;
  status: string;
}

export const LoyaltySystem = ({ userId }: { userId: string }) => {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const { toast } = useToast();

  const fetchLoyaltyData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_loyalty_points')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setLoyaltyData(data);
      } else {
        // Initialize loyalty data for new user
        const { data: newData, error: insertError } = await supabase
          .from('user_loyalty_points')
          .insert([{ user_id: userId }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        setLoyaltyData(newData);
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    }
  }, [userId]);

  const fetchAchievements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  }, [userId]);

  const fetchMissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Error fetching missions:', error);
    }
  }, [userId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLoyaltyData(),
        fetchAchievements(),
        fetchMissions()
      ]);
      setLoading(false);
    };
    
    if (userId) {
      loadData();
    }
  }, [userId, fetchLoyaltyData, fetchAchievements, fetchMissions]);

  const levelInfo = useMemo(() => {
    const level = loyaltyData?.level || 'bronze';
    
    switch (level) {
      case 'diamond':
        return { name: 'Diamante', icon: <Crown className="w-6 h-6" />, color: 'bg-futuristic-hologram', nextLevel: null, threshold: 10000 };
      case 'gold':
        return { name: 'Ouro', icon: <Trophy className="w-6 h-6" />, color: 'bg-yellow-500', nextLevel: 'diamond', threshold: 5000 };
      case 'silver':
        return { name: 'Prata', icon: <Star className="w-6 h-6" />, color: 'bg-gray-400', nextLevel: 'gold', threshold: 2000 };
      default:
        return { name: 'Bronze', icon: <Zap className="w-6 h-6" />, color: 'bg-plan-free', nextLevel: 'silver', threshold: 0 };
    }
  }, [loyaltyData?.level]);

  const progressToNextLevel = useMemo(() => {
    if (!loyaltyData || !levelInfo.nextLevel) return 100;
    
    const nextLevelInfo = (() => {
      switch (levelInfo.nextLevel) {
        case 'diamond': return { threshold: 10000 };
        case 'gold': return { threshold: 5000 };
        case 'silver': return { threshold: 2000 };
        default: return { threshold: 0 };
      }
    })();
    
    const progress = ((loyaltyData.points - levelInfo.threshold) / (nextLevelInfo.threshold - levelInfo.threshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }, [loyaltyData, levelInfo]);

  const claimDailyReward = async () => {
    if (claiming) return;
    
    setClaiming(true);
    try {
      const { error } = await supabase.rpc('award_loyalty_points', {
        user_uuid: userId,
        points_amount: 50,
        activity_type: 'daily_login'
      });

      if (error) throw error;

      toast({
        title: "Recompensa diária coletada!",
        description: "Você ganhou 50 pontos de loyalty",
      });

      await fetchLoyaltyData();
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      toast({
        title: "Erro",
        description: "Não foi possível coletar a recompensa",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted/20 rounded-lg backdrop-blur-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loyalty Overview */}
      <Card className="bg-gradient-to-br from-futuristic-primary/10 to-futuristic-secondary/10 border-futuristic-primary/20 shadow-lg backdrop-blur-sm animate-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-futuristic-primary">
            {levelInfo.icon}
            Sistema de Loyalty - Nível {levelInfo.name}
          </CardTitle>
          <CardDescription>
            Ganhe pontos por atividades e suba de nível para desbloquear recompensas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background/30 rounded-lg backdrop-blur-sm border border-primary/10">
              <div className="text-2xl font-bold text-futuristic-electric">{loyaltyData?.points || 0}</div>
              <div className="text-sm text-muted-foreground">Pontos Atuais</div>
            </div>
            <div className="text-center p-4 bg-background/30 rounded-lg backdrop-blur-sm border border-primary/10">
              <div className="text-2xl font-bold text-futuristic-neon">{loyaltyData?.total_earned || 0}</div>
              <div className="text-sm text-muted-foreground">Total Ganho</div>
            </div>
            <div className="text-center p-4 bg-background/30 rounded-lg backdrop-blur-sm border border-primary/10">
              <Badge className={`${levelInfo.color} text-white`}>
                {levelInfo.name}
              </Badge>
              <div className="text-sm text-muted-foreground mt-2">Nível Atual</div>
            </div>
          </div>

          {levelInfo.nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso para {(() => {
                  switch (levelInfo.nextLevel) {
                    case 'diamond': return 'Diamante';
                    case 'gold': return 'Ouro';
                    case 'silver': return 'Prata';
                    default: return 'Bronze';
                  }
                })()}</span>
                <span>{Math.round(progressToNextLevel)}%</span>
              </div>
              <Progress value={progressToNextLevel} className="h-3" />
            </div>
          )}

          <Button 
            onClick={claimDailyReward} 
            disabled={claiming}
            className="w-full bg-futuristic-gradient hover:opacity-90 disabled:opacity-50 transition-all duration-300"
          >
            <Gift className="w-4 h-4 mr-2" />
            {claiming ? 'Coletando...' : 'Coletar Recompensa Diária (+50 pontos)'}
          </Button>
        </CardContent>
      </Card>

      {/* Active Missions */}
      {missions.length > 0 && (
        <Card className="bg-background/40 backdrop-blur-sm border-futuristic-accent/20">
          <CardHeader>
            <CardTitle className="text-futuristic-accent">Missões Ativas</CardTitle>
            <CardDescription>Complete missões para ganhar pontos extras</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {missions.map((mission) => (
              <div key={mission.id} className="p-4 border border-futuristic-primary/20 rounded-lg bg-background/20 backdrop-blur-xs">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{mission.mission_description}</h4>
                  <Badge variant="outline" className="text-futuristic-electric border-futuristic-electric">
                    +{mission.points_reward} pts
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progresso</span>
                    <span>{mission.current_progress}/{mission.target_value}</span>
                  </div>
                  <Progress 
                    value={(mission.current_progress / mission.target_value) * 100} 
                    className="h-2" 
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {achievements.length > 0 && (
        <Card className="bg-background/40 backdrop-blur-sm border-futuristic-neon/20">
          <CardHeader>
            <CardTitle className="text-futuristic-neon">Conquistas Recentes</CardTitle>
            <CardDescription>Suas últimas conquistas desbloqueadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 p-3 border border-futuristic-hologram/20 rounded-lg bg-background/10 backdrop-blur-xs">
                <Trophy className="w-8 h-8 text-futuristic-hologram" />
                <div className="flex-1">
                  <h4 className="font-medium">{achievement.achievement_name}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.achievement_description}</p>
                </div>
                <Badge variant="outline" className="text-futuristic-hologram border-futuristic-hologram">
                  +{achievement.points_awarded} pts
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
