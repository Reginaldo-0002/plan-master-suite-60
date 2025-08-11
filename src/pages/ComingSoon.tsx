
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpcomingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
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

  useEffect(() => {
    fetchUpcomingContent();
  }, []);

  const fetchUpcomingContent = async () => {
    try {
      console.log('Fetching upcoming content...');
      
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('content')
        .select('id, title, description, content_type, required_plan, hero_image_url, scheduled_publish_at as release_date, created_at, updated_at')
        .gte('scheduled_publish_at', todayString)
        .order('scheduled_publish_at', { ascending: true });

      console.log('Upcoming content result:', { data, error });

      if (error) {
        console.error('Error fetching upcoming content:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar conteúdo futuro",
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

  const getTimeUntilRelease = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diffTime = release.getTime() - now.getTime();
    
    if (diffTime <= 0) return "Disponível agora";
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 dia";
    if (diffDays < 30) return `${diffDays} dias`;
    
    const diffMonths = Math.ceil(diffDays / 30);
    if (diffMonths === 1) return "1 mês";
    
    return `${diffMonths} meses`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6" />
        <h1 className="text-3xl font-bold text-foreground">Em Breve</h1>
      </div>
      
      <p className="text-muted-foreground">
        Confira os próximos lançamentos e novidades que estão chegando na plataforma.
      </p>

      {upcomingContent.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum lançamento programado</h3>
            <p className="text-muted-foreground">
              Não há novos conteúdos programados para lançamento no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcomingContent.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {item.hero_image_url && (
                <div className="h-48 bg-cover bg-center" 
                     style={{ backgroundImage: `url(${item.hero_image_url})` }} />
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
                {item.release_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Lança em: {getTimeUntilRelease(item.release_date)}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  <Calendar className="w-4 h-4 mr-2" />
                  {item.release_date ? `Disponível em ${new Date(item.release_date).toLocaleDateString('pt-BR')}` : 'Em breve'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComingSoon;
