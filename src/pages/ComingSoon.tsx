
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, Calendar, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UpcomingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  status: 'active' | 'maintenance' | 'blocked';
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

const ComingSoon = () => {
  const [upcomingContent, setUpcomingContent] = useState<UpcomingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingContent();
  }, []);

  const fetchUpcomingContent = async () => {
    try {
      // Buscar conteúdo com data de lançamento futura ou atual
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      console.log('Fetching upcoming content for date:', todayStr);
      
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .not('release_date', 'is', null)
        .gte('release_date', todayStr)
        .order('release_date', { ascending: true });

      console.log('Upcoming content result:', { data, error });

      if (error) {
        console.error('Error fetching upcoming content:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar próximos lançamentos",
          variant: "destructive",
        });
        return;
      }

      setUpcomingContent(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Crown className="w-4 h-4" />;
      case 'vip': return <Gem className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Amanhã";
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const getDaysUntilRelease = (dateString: string) => {
    const releaseDate = new Date(dateString);
    const today = new Date();
    const diffTime = releaseDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Próximos Lançamentos</h1>
            <p className="text-muted-foreground">Confira o que está por vir na plataforma</p>
          </div>
        </div>

        {upcomingContent.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum lançamento programado</h3>
              <p className="text-muted-foreground">
                Não há novos conteúdos programados para lançamento no momento. 
                Fique atento às atualizações!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingContent.map((item) => {
              const daysUntilRelease = getDaysUntilRelease(item.release_date!);
              
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {item.hero_image_url && (
                    <div className="h-48 bg-cover bg-center relative" 
                         style={{ backgroundImage: `url(${item.hero_image_url})` }}>
                      <div className="absolute top-2 right-2">
                        {daysUntilRelease === 0 && (
                          <Badge className="bg-success text-white">
                            Disponível Hoje!
                          </Badge>
                        )}
                        {daysUntilRelease === 1 && (
                          <Badge className="bg-warning text-white">
                            Amanhã
                          </Badge>
                        )}
                        {daysUntilRelease > 1 && (
                          <Badge className="bg-primary text-white">
                            {daysUntilRelease} dias
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge className={getPlanColor(item.required_plan)}>
                        {getPlanIcon(item.required_plan)}
                        <span className="ml-1 uppercase">{item.required_plan}</span>
                      </Badge>
                    </div>
                    {item.description && (
                      <CardDescription>{item.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Lançamento: {formatReleaseDate(item.release_date!)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {daysUntilRelease === 0 ? (
                      <Button className="w-full">
                        Acessar Agora
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        <Calendar className="w-4 h-4 mr-2" />
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
    </div>
  );
};

export default ComingSoon;
