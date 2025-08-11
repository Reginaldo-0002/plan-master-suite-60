
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  carousel_image_url: string | null;
  required_plan: 'free' | 'vip' | 'pro';
  carousel_order: number;
}

interface ContentCarouselProps {
  userPlan: 'free' | 'vip' | 'pro';
  onContentClick: (contentId: string) => void;
}

export const ContentCarousel = ({ userPlan, onContentClick }: ContentCarouselProps) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCarouselContents();
  }, []);

  const fetchCarouselContents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('is_active', true)
        .eq('show_in_carousel', true)
        .not('carousel_image_url', 'is', null)
        .order('carousel_order', { ascending: true });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching carousel contents:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conteúdos do carrossel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (content: Content) => {
    const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };
    return planHierarchy[userPlan] >= planHierarchy[content.required_plan];
  };

  const handleContentClick = (content: Content) => {
    if (!hasAccess(content)) {
      toast({
        title: "Acesso Restrito",
        description: `Este conteúdo requer o plano ${content.required_plan.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }
    onContentClick(content.id);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando carrossel...</p>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum conteúdo disponível no carrossel</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <Carousel className="w-full">
        <CarouselContent>
          {contents.map((content) => (
            <CarouselItem key={content.id} className="md:basis-1/2 lg:basis-1/3">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={content.carousel_image_url || '/placeholder.svg'}
                      alt={content.title}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: '16/9' }}
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handleContentClick(content)}
                        variant={hasAccess(content) ? "default" : "outline"}
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        {hasAccess(content) ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Tópicos
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Upgrade
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg truncate">{content.title}</h3>
                      {!hasAccess(content) && (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={getPlanBadgeColor(content.required_plan)}>
                        {content.required_plan.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground capitalize">
                        {content.content_type}
                      </span>
                    </div>
                    {content.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {content.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};
