
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Gem, Star, Play, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  carousel_image_url: string | null;
  video_url: string | null;
  carousel_order: number;
  estimated_duration: number | null;
  difficulty_level: string | null;
}

interface ContentCarouselProps {
  userPlan: 'free' | 'vip' | 'pro';
  onContentClick?: (contentId: string) => void;
}

export const ContentCarousel = ({ userPlan, onContentClick }: ContentCarouselProps) => {
  const [carouselContent, setCarouselContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };

  useEffect(() => {
    fetchCarouselContent();
  }, []);

  const fetchCarouselContent = async () => {
    try {
      console.log('Fetching carousel content...');
      
      const { data, error } = await supabase
        .from('content')
        .select(`
          id, 
          title, 
          description, 
          content_type, 
          required_plan, 
          hero_image_url, 
          carousel_image_url, 
          video_url, 
          carousel_order, 
          estimated_duration, 
          difficulty_level
        `)
        .eq('is_active', true)
        .eq('show_in_carousel', true)
        .order('carousel_order', { ascending: true })
        .order('created_at', { ascending: false });

      console.log('Carousel content result:', { data, error });

      if (error) {
        console.error('Error fetching carousel content:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar conteúdo do carrossel",
          variant: "destructive",
        });
        return;
      }

      setCarouselContent(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar carrossel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (contentPlan: string) => {
    return planHierarchy[userPlan] >= planHierarchy[contentPlan as keyof typeof planHierarchy];
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

  const getDifficultyColor = (level: string | null) => {
    switch (level) {
      case 'advanced': return 'bg-red-500 text-white';
      case 'intermediate': return 'bg-yellow-500 text-white';
      case 'beginner': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDifficultyText = (level: string | null) => {
    switch (level) {
      case 'advanced': return 'Avançado';
      case 'intermediate': return 'Intermediário';
      case 'beginner': return 'Iniciante';
      default: return 'Não definido';
    }
  };

  const handleContentAccess = async (item: ContentItem) => {
    if (!canAccess(item.required_plan)) {
      toast({
        title: "Acesso Restrito",
        description: `Este conteúdo requer plano ${item.required_plan.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Log user interaction
      await supabase
        .from('user_interactions')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          interaction_type: 'carousel_click',
          target_type: 'content',
          target_id: item.id,
          metadata: { content_type: item.content_type }
        }]);

      if (onContentClick) {
        onContentClick(item.id);
      } else if (item.video_url) {
        window.open(item.video_url, '_blank');
      } else {
        toast({
          title: "Conteúdo acessado",
          description: `Acessando: ${item.title}`,
        });
      }
    } catch (error) {
      console.error('Error accessing content:', error);
      toast({
        title: "Erro",
        description: "Erro ao acessar conteúdo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (carouselContent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-4 bg-muted/20 rounded-full">
          <Star className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo em destaque</h3>
        <p className="text-muted-foreground max-w-md">
          Ainda não há conteúdo configurado para aparecer no carrossel. 
          Novos conteúdos em destaque aparecerão aqui em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Conteúdo em Destaque</h2>
        <p className="text-muted-foreground">
          Explore nossos melhores conteúdos, cursos, ferramentas e produtos
        </p>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {carouselContent.map((item) => (
            <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {(item.carousel_image_url || item.hero_image_url) && (
                    <div 
                      className="h-48 bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url(${item.carousel_image_url || item.hero_image_url})` 
                      }}
                    />
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge className={getPlanColor(item.required_plan)}>
                      {getPlanIcon(item.required_plan)}
                      <span className="ml-1 uppercase">{item.required_plan}</span>
                    </Badge>
                  </div>
                  {item.difficulty_level && (
                    <div className="absolute top-2 left-2">
                      <Badge className={getDifficultyColor(item.difficulty_level)}>
                        {getDifficultyText(item.difficulty_level)}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)}
                        </Badge>
                        {item.estimated_duration && (
                          <span className="text-xs text-muted-foreground">
                            {item.estimated_duration} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {item.description && (
                    <CardDescription className="line-clamp-3">
                      {item.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {canAccess(item.required_plan) ? (
                    <Button 
                      className="w-full" 
                      onClick={() => handleContentAccess(item)}
                    >
                      {item.video_url ? (
                        <Play className="w-4 h-4 mr-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Acessar
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Necessário
                    </Button>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};
