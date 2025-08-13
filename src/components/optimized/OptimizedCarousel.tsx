import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Crown, Gem, Star, Play, ExternalLink, Loader2 } from "lucide-react";
import { LazyImage } from "./LazyImage";
import { useOptimizedQueries } from "@/hooks/useOptimizedQueries";

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

interface OptimizedCarouselProps {
  userPlan: 'free' | 'vip' | 'pro';
  onContentClick?: (contentId: string) => void;
}

const CarouselItemCard = memo(({ 
  item, 
  userPlan, 
  onContentAccess 
}: { 
  item: ContentItem; 
  userPlan: 'free' | 'vip' | 'pro';
  onContentAccess: (item: ContentItem) => void;
}) => {
  const planHierarchy = useMemo(() => ({ 'free': 0, 'vip': 1, 'pro': 2 }), []);
  
  const canAccess = useMemo(() => 
    planHierarchy[userPlan] >= planHierarchy[item.required_plan],
    [userPlan, item.required_plan, planHierarchy]
  );

  const planIcon = useMemo(() => {
    switch (item.required_plan) {
      case 'pro': return <Crown className="w-4 h-4" />;
      case 'vip': return <Gem className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  }, [item.required_plan]);

  const planColor = useMemo(() => {
    switch (item.required_plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      default: return 'bg-plan-free text-white';
    }
  }, [item.required_plan]);

  const difficultyColor = useMemo(() => {
    switch (item.difficulty_level) {
      case 'advanced': return 'bg-red-500 text-white';
      case 'intermediate': return 'bg-yellow-500 text-white';
      case 'beginner': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  }, [item.difficulty_level]);

  const difficultyText = useMemo(() => {
    switch (item.difficulty_level) {
      case 'advanced': return 'Avançado';
      case 'intermediate': return 'Intermediário';
      case 'beginner': return 'Iniciante';
      default: return 'Não definido';
    }
  }, [item.difficulty_level]);

  const handleClick = useCallback(() => {
    onContentAccess(item);
  }, [item, onContentAccess]);

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {(item.carousel_image_url || item.hero_image_url) && (
          <LazyImage
            src={item.carousel_image_url || item.hero_image_url || ''}
            alt={item.title}
            className="h-48"
            placeholderClassName="h-48"
          />
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge className={planColor}>
            {planIcon}
            <span className="ml-1 uppercase">{item.required_plan}</span>
          </Badge>
        </div>
        {item.difficulty_level && (
          <div className="absolute top-2 left-2">
            <Badge className={difficultyColor}>
              {difficultyText}
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
        {canAccess ? (
          <Button 
            className="w-full" 
            onClick={handleClick}
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
  );
});

CarouselItemCard.displayName = 'CarouselItemCard';

export const OptimizedCarousel = memo(({ userPlan, onContentClick }: OptimizedCarouselProps) => {
  const [carouselContent, setCarouselContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchWithErrorHandling, memoizedToast } = useOptimizedQueries();

  const fetchCarouselContent = useCallback(async () => {
    const data = await fetchWithErrorHandling(
      async () => {
        const { supabase } = await import('@/integrations/supabase/client');
        return supabase
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
      },
      'Falha ao carregar conteúdo do carrossel'
    );

    if (data) {
      setCarouselContent(data);
    }
    setLoading(false);
  }, [fetchWithErrorHandling]);

  useEffect(() => {
    fetchCarouselContent();
  }, [fetchCarouselContent]);

  const handleContentAccess = useCallback(async (item: ContentItem) => {
    const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };
    const canAccess = planHierarchy[userPlan] >= planHierarchy[item.required_plan];
    
    if (!canAccess) {
      memoizedToast(
        "Acesso Restrito",
        `Este conteúdo requer plano ${item.required_plan.toUpperCase()}`,
        'destructive'
      );
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const user = (await supabase.auth.getUser()).data.user;
      
      if (user) {
        await supabase
          .from('user_interactions')
          .insert([{
            user_id: user.id,
            interaction_type: 'carousel_click',
            target_type: 'content',
            target_id: item.id,
            metadata: { content_type: item.content_type }
          }]);
      }

      if (onContentClick) {
        onContentClick(item.id);
      } else if (item.video_url) {
        window.open(item.video_url, '_blank');
      } else {
        memoizedToast("Conteúdo acessado", `Acessando: ${item.title}`);
      }
    } catch (error) {
      console.error('Error accessing content:', error);
      memoizedToast("Erro", "Erro ao acessar conteúdo", 'destructive');
    }
  }, [userPlan, onContentClick, memoizedToast]);

  const carouselItems = useMemo(() => 
    carouselContent.map((item) => (
      <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
        <CarouselItemCard
          item={item}
          userPlan={userPlan}
          onContentAccess={handleContentAccess}
        />
      </CarouselItem>
    )),
    [carouselContent, userPlan, handleContentAccess]
  );

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
          {carouselItems}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
});

OptimizedCarousel.displayName = 'OptimizedCarousel';