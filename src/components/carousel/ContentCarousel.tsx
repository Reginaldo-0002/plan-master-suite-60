
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
      setLoading(true);
      
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('show_in_carousel', true)
        .eq('is_active', true)
        .order('carousel_order', { ascending: true });

      if (error) {
        console.error('Error fetching carousel content:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar conteúdo do carousel",
          variant: "destructive",
        });
        return;
      }

      setCarouselContent(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar carousel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (contentPlan: string) => {
    const userLevel = planHierarchy[userPlan] || 0;
    const requiredLevel = planHierarchy[contentPlan as keyof typeof planHierarchy] || 0;
    return userLevel >= requiredLevel;
  };

  const handleContentAccess = async (contentItem: ContentItem) => {
    if (!canAccess(contentItem.required_plan)) {
      toast({
        title: "Acesso Restrito",
        description: `Este conteúdo requer plano ${contentItem.required_plan.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      if (user) {
        await supabase
          .from('user_interactions')
          .insert([{
            user_id: user.id,
            interaction_type: 'content_access',
            target_type: 'content',
            target_id: contentItem.id,
            metadata: { content_type: contentItem.content_type }
          }]);
      }

      if (onContentClick) {
        onContentClick(contentItem.id);
      } else if (contentItem.video_url) {
        window.open(contentItem.video_url, '_blank');
      } else {
        toast({
          title: "Conteúdo acessado",
          description: `Acessando: ${contentItem.title}`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (carouselContent.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum conteúdo disponível no carousel.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <Carousel className="w-full">
        <CarouselContent>
          {carouselContent.map((item) => (
            <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                  {(item.carousel_image_url || item.hero_image_url) && (
                    <div 
                      className="h-48 bg-cover bg-center" 
                      style={{ 
                        backgroundImage: `url(${item.carousel_image_url || item.hero_image_url})` 
                      }} 
                    />
                  )}
                  <CardHeader className="flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                      <Badge className={getPlanColor(item.required_plan)}>
                        {getPlanIcon(item.required_plan)}
                        <span className="ml-1 uppercase">{item.required_plan}</span>
                      </Badge>
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
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};
