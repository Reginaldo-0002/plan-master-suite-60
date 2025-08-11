import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Images, Loader2, Play, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface CarouselContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  hero_image_url: string | null;
  video_url: string | null;
  required_plan: 'free' | 'vip' | 'pro';
  status: 'active' | 'maintenance' | 'blocked';
  show_in_carousel: boolean;
  carousel_order: number;
}

interface CarouselSectionProps {
  userPlan: 'free' | 'vip' | 'pro';
}

export const CarouselSection = ({ userPlan }: CarouselSectionProps) => {
  const [carouselContent, setCarouselContent] = useState<CarouselContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };

  useEffect(() => {
    fetchCarouselContent();
  }, []);

  const fetchCarouselContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('id, title, description, content_type, hero_image_url, video_url, required_plan, status, show_in_carousel, carousel_order')
        .eq('is_active', true)
        .eq('show_in_carousel', true)
        .order('carousel_order', { ascending: true });

      if (error) throw error;

      const mappedData: CarouselContent[] = (data || []).map(item => ({
        ...item,
        status: (item.status as 'active' | 'maintenance' | 'blocked') || 'active'
      }));

      setCarouselContent(mappedData);
    } catch (error) {
      console.error('Error fetching carousel content:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conteúdo do carrossel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (contentPlan: string) => {
    return planHierarchy[userPlan] >= planHierarchy[contentPlan as keyof typeof planHierarchy];
  };

  const handleContentAccess = async (content: CarouselContent) => {
    if (!canAccess(content.required_plan) || content.status !== 'active') {
      return;
    }

    try {
      // Log user interaction
      await supabase
        .from('user_interactions')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          interaction_type: 'carousel_access',
          target_type: 'content',
          target_id: content.id,
          metadata: { content_type: content.content_type }
        }]);

      // Open content
      if (content.video_url) {
        window.open(content.video_url, '_blank');
      } else {
        toast({
          title: "Conteúdo acessado",
          description: `Acessando: ${content.title}`,
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
      case 'pro': return '👑';
      case 'vip': return '💎';
      default: return '⭐';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-white';
      case 'maintenance': return 'bg-warning text-white';
      case 'blocked': return 'bg-destructive text-white';
      default: return 'bg-muted text-muted-foreground';
    }
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
        <Images className="w-6 h-6" />
        <h1 className="text-3xl font-bold text-foreground">Carrossel de Conteúdo</h1>
        <Badge variant="outline" className="text-primary border-primary">
          {carouselContent.length} Itens
        </Badge>
      </div>

      {carouselContent.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Images className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhum conteúdo no carrossel
            </p>
            <p className="text-muted-foreground">
              O administrador ainda não configurou conteúdo para o carrossel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {carouselContent.map((content) => (
                <CarouselItem key={content.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                    {content.hero_image_url && (
                      <div 
                        className="h-48 bg-cover bg-center relative"
                        style={{ backgroundImage: `url(${content.hero_image_url})` }}
                      >
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Badge className={getPlanColor(content.required_plan)}>
                            {getPlanIcon(content.required_plan)} {content.required_plan.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(content.status)}>
                            {content.status === 'active' ? 'Ativo' : 
                             content.status === 'maintenance' ? 'Manutenção' : 'Bloqueado'}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2">{content.title}</CardTitle>
                      {content.description && (
                        <CardDescription className="line-clamp-3">
                          {content.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      {canAccess(content.required_plan) && content.status === 'active' ? (
                        <Button 
                          className="w-full" 
                          onClick={() => handleContentAccess(content)}
                        >
                          {content.video_url ? (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Assistir
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </>
                          )}
                        </Button>
                      ) : !canAccess(content.required_plan) ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Lock className="w-4 h-4 mr-2" />
                          Upgrade Necessário
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          {content.status === 'maintenance' ? 'Em Manutenção' : 'Indisponível'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>

          {/* Grid view for better browsing */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {carouselContent.map((content) => (
              <Card key={`grid-${content.id}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                {content.hero_image_url && (
                  <div 
                    className="h-32 bg-cover bg-center"
                    style={{ backgroundImage: `url(${content.hero_image_url})` }}
                  />
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm line-clamp-2">{content.title}</CardTitle>
                    <Badge className={`text-xs ${getPlanColor(content.required_plan)}`}>
                      {getPlanIcon(content.required_plan)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {canAccess(content.required_plan) && content.status === 'active' ? (
                    <Button 
                      size="sm"
                      className="w-full" 
                      onClick={() => handleContentAccess(content)}
                    >
                      {content.video_url ? 'Assistir' : 'Ver'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      {!canAccess(content.required_plan) ? 'Bloqueado' : 'Indisponível'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};