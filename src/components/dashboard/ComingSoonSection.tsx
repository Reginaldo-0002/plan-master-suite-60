import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Star, Bell, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAreaTracking } from "@/hooks/useAreaTracking";
import { TopicsRouter } from "@/components/navigation/TopicsRouter";

interface UpcomingRelease {
  id: string;
  title: string;
  description: string | null;
  content_preview: string | null;
  release_date: string;
  announcement_image: string | null;
  target_plans: string[];
  countdown_enabled: boolean;
}

interface ComingSoonSectionProps {
  userPlan?: 'free' | 'vip' | 'pro' | 'premium';
}

export const ComingSoonSection = ({ userPlan }: ComingSoonSectionProps) => {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { trackAreaAccess } = useAreaTracking();

  useEffect(() => {
    fetchUpcomingReleases();
  }, []);

  const fetchUpcomingReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select('*')
        .eq('is_active', true)
        .order('release_date', { ascending: true });

      if (error) throw error;

      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching upcoming releases:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lançamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diff = release.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  const isReleased = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    return now >= release;
  };

  const canUserAccess = (targetPlans: string[]) => {
    if (!userPlan) return false;
    if (targetPlans.includes('free')) return true;
    if (targetPlans.includes('vip') && (userPlan === 'vip' || userPlan === 'pro')) return true;
    if (targetPlans.includes('pro') && userPlan === 'pro') return true;
    return false;
  };

  const handleAccessContent = async (releaseTitle: string) => {
    try {
      // Buscar conteúdo associado ao título do lançamento
      const { data: content, error } = await supabase
        .from('content')
        .select('id')
        .eq('title', releaseTitle)
        .eq('is_active', true)
        .single();

      if (error || !content) {
        toast({
          title: "Erro",
          description: "Conteúdo não encontrado ou ainda não disponível",
          variant: "destructive",
        });
        return;
      }

      // Track area access when accessing upcoming content
      trackAreaAccess(`UpcomingContent-${content.id}`);
      
      setSelectedContentId(content.id);
    } catch (error) {
      console.error('Error accessing content:', error);
      toast({
        title: "Erro",
        description: "Erro ao acessar conteúdo",
        variant: "destructive",
      });
    }
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanBadgeColor = (plans: string[]) => {
    if (plans.includes('pro')) return 'bg-plan-pro text-white';
    if (plans.includes('vip')) return 'bg-plan-vip text-white';
    return 'bg-plan-free text-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se um conteúdo foi selecionado, mostrar os tópicos
  if (selectedContentId && userPlan) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => setSelectedContentId(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Lançamentos
          </Button>
        </div>
        <TopicsRouter
          contentId={selectedContentId}
          userPlan={userPlan}
          onBack={() => setSelectedContentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6" />
        <h1 className="text-3xl font-bold text-foreground">Próximos Lançamentos</h1>
        <Badge variant="outline" className="text-primary border-primary">
          {releases.length} Em Breve
        </Badge>
      </div>

      {releases.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhum lançamento programado
            </p>
            <p className="text-muted-foreground">
              Fique atento! Novos conteúdos e funcionalidades serão anunciados em breve.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {releases.map((release) => {
            const timeRemaining = calculateTimeRemaining(release.release_date);
            
            return (
              <Card key={release.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {release.announcement_image && (
                  <div 
                    className="h-48 bg-cover bg-center"
                    style={{ backgroundImage: `url(${release.announcement_image})` }}
                  />
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg">{release.title}</CardTitle>
                    <Badge className={getPlanBadgeColor(release.target_plans)}>
                      <Star className="w-3 h-3 mr-1" />
                      {release.target_plans.includes('pro') ? 'PRO' :
                       release.target_plans.includes('vip') ? 'VIP' : 'FREE'}
                    </Badge>
                  </div>
                  
                  {release.description && (
                    <CardDescription>{release.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Countdown */}
                  {release.countdown_enabled && timeRemaining && (
                    <div className="bg-primary/5 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Tempo restante:</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background p-2 rounded">
                          <div className="text-lg font-bold text-foreground">{timeRemaining.days}</div>
                          <div className="text-xs text-muted-foreground">Dias</div>
                        </div>
                        <div className="bg-background p-2 rounded">
                          <div className="text-lg font-bold text-foreground">{timeRemaining.hours}</div>
                          <div className="text-xs text-muted-foreground">Horas</div>
                        </div>
                        <div className="bg-background p-2 rounded">
                          <div className="text-lg font-bold text-foreground">{timeRemaining.minutes}</div>
                          <div className="text-xs text-muted-foreground">Min</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Release Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatReleaseDate(release.release_date)}</span>
                  </div>

                  {/* Content Preview */}
                  {release.content_preview && (
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm text-foreground">{release.content_preview}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  {isReleased(release.release_date) ? (
                    <Button 
                      className="w-full" 
                      onClick={() => handleAccessContent(release.title)}
                      disabled={!canUserAccess(release.target_plans)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      {canUserAccess(release.target_plans) ? 'Acessar' : 'Upgrade Necessário'}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <Bell className="w-4 h-4 mr-2" />
                      Aguardando Lançamento
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};