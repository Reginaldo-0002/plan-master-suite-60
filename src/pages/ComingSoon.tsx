import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Rocket, Star, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MagneticBackground } from "@/components/background/MagneticBackground";

interface UpcomingRelease {
  id: string;
  title: string;
  description: string | null;
  release_date: string;
  target_plans: string[];
  countdown_enabled: boolean;
  announcement_image: string | null;
  content_preview: string | null;
}

interface Profile {
  plan: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const ComingSoon = () => {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchUserProfile();
    fetchUpcomingReleases();
    
    // Atualizar timer a cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setUserPlan(data?.plan || 'free');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUpcomingReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select('*')
        .eq('is_active', true)
        .order('release_date', { ascending: true });

      if (error) throw error;
      
      // Filtrar apenas lançamentos que ainda não passaram
      const now = new Date();
      const futureReleases = (data || []).filter(release => 
        new Date(release.release_date) > now
      );
      
      console.log('Upcoming releases found:', futureReleases.length);
      setReleases(futureReleases);
    } catch (error) {
      console.error('Error fetching upcoming releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeLeft = (releaseDate: string): TimeLeft => {
    const difference = new Date(releaseDate).getTime() - currentTime.getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  };

  const isUserEligible = (targetPlans: string[]) => {
    return targetPlans.includes(userPlan);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <MagneticBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futuristic-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando próximos lançamentos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="min-h-screen bg-background relative">
        <MagneticBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20 max-w-md mx-4">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Rocket className="w-16 h-16 text-futuristic-primary mb-4" />
              <h2 className="text-2xl font-bold text-futuristic-primary mb-2">Em Breve</h2>
              <p className="text-muted-foreground text-center">
                Não há novos lançamentos programados no momento. Fique atento às nossas atualizações!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <MagneticBackground />
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="w-8 h-8 text-futuristic-neon" />
            <h1 className="text-4xl font-bold bg-futuristic-gradient bg-clip-text text-transparent">
              Próximos Lançamentos
            </h1>
            <Star className="w-8 h-8 text-futuristic-neon" />
          </div>
          <p className="text-xl text-muted-foreground">
            Novidades incríveis estão chegando! Veja o que temos preparado para você.
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl mx-auto">
          {releases.map((release) => {
            const timeLeft = calculateTimeLeft(release.release_date);
            const isEligible = isUserEligible(release.target_plans);

            return (
              <Card 
                key={release.id} 
                className={`bg-background/60 backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 ${
                  isEligible 
                    ? 'border-futuristic-primary/40 hover:border-futuristic-primary' 
                    : 'border-muted/40 opacity-75'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl text-futuristic-primary flex items-center gap-2">
                        <Rocket className="w-6 h-6" />
                        {release.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        {release.target_plans.map((plan) => (
                          <Badge key={plan} className={getPlanBadgeColor(plan)}>
                            {plan === 'free' ? 'Gratuito' : plan.toUpperCase()}
                          </Badge>
                        ))}
                        {!isEligible && (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                            Upgrade necessário
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Calendar className="w-8 h-8 text-futuristic-accent" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {release.announcement_image && (
                    <div className="relative rounded-lg overflow-hidden">
                      <img 
                        src={release.announcement_image} 
                        alt={release.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-futuristic-gradient opacity-20"></div>
                    </div>
                  )}

                  {release.description && (
                    <p className="text-muted-foreground text-lg">{release.description}</p>
                  )}

                  {release.content_preview && (
                    <div className="p-4 bg-futuristic-primary/10 rounded-lg border border-futuristic-primary/20">
                      <h4 className="font-semibold text-futuristic-primary mb-2">Preview do Conteúdo:</h4>
                      <p className="text-sm">{release.content_preview}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Lançamento: {formatDate(release.release_date)}
                      </span>
                    </div>
                  </div>

                  {release.countdown_enabled && timeLeft.days >= 0 && (
                    <div className="p-6 bg-futuristic-gradient/10 rounded-lg border border-futuristic-primary/20">
                      <div className="text-center">
                        <Clock className="w-8 h-8 text-futuristic-neon mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-futuristic-primary mb-4">
                          Tempo restante:
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-futuristic-neon">{timeLeft.days}</div>
                            <div className="text-sm text-muted-foreground">Dias</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-futuristic-neon">{timeLeft.hours}</div>
                            <div className="text-sm text-muted-foreground">Horas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-futuristic-neon">{timeLeft.minutes}</div>
                            <div className="text-sm text-muted-foreground">Minutos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-futuristic-neon">{timeLeft.seconds}</div>
                            <div className="text-sm text-muted-foreground">Segundos</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEligible && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 text-center">
                        Este lançamento é exclusivo para planos {release.target_plans.join(', ').toUpperCase()}. 
                        Faça upgrade para ter acesso!
                      </p>
                      <Button 
                        className="w-full mt-3 bg-futuristic-gradient hover:opacity-90"
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        Fazer Upgrade
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-futuristic-gradient hover:opacity-90"
            size="lg"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
