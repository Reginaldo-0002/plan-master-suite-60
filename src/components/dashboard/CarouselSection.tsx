import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Images, Loader2, Play, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedNavigation } from "@/hooks/useOptimizedNavigation";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface CarouselContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  hero_image_url: string | null;
  video_url: string | null;
  required_plan: 'free' | 'vip' | 'pro' | 'premium';
  status: 'active' | 'maintenance' | 'blocked' | 'published' | 'draft';
  show_in_carousel: boolean;
  carousel_order: number;
}

interface CarouselSectionProps {
  userPlan: 'free' | 'vip' | 'pro' | 'premium';
  onContentSelect?: (contentId: string) => void;
}

export const CarouselSection = ({ userPlan, onContentSelect }: CarouselSectionProps) => {
  const [carouselContent, setCarouselContent] = useState<CarouselContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { navigateToPlans } = useOptimizedNavigation();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2, 'premium': 3 };

  useEffect(() => {
    fetchCarouselContent();
  }, []);

  const fetchCarouselContent = async () => {
    try {
      // Verificar usuário atual para debug
      const currentUser = await supabase.auth.getUser();
      console.log('👤 Current user ID for carousel:', currentUser.data.user?.id);
      
      const { data, error } = await supabase
        .from('content')
        .select('id, title, description, content_type, hero_image_url, video_url, required_plan, status, show_in_carousel, carousel_order')
        .eq('is_active', true)
        .eq('show_in_carousel', true)
        .eq('status', 'published')
        .order('carousel_order', { ascending: true });

      if (error) throw error;

      console.log('📋 Carousel content fetched (before filtering):', data);
      
      // Filtrar manualmente conteúdo oculto para garantir
      let filteredData = data || [];
      
      if (currentUser.data.user?.id) {
        const { data: hiddenContent } = await supabase
          .from('content_visibility_rules')
          .select('content_id')
          .eq('user_id', currentUser.data.user.id)
          .eq('is_visible', false);
          
        const hiddenContentIds = hiddenContent?.map(rule => rule.content_id) || [];
        console.log('🚫 Hidden carousel content IDs for user:', hiddenContentIds);
        
        // Filtrar conteúdo oculto
        filteredData = filteredData.filter(item => !hiddenContentIds.includes(item.id));
        
        console.log('✅ Carousel content after manual filtering:', { 
          count: filteredData.length, 
          items: filteredData.map(item => ({ id: item.id, title: item.title }))
        });
      }

      const mappedData: CarouselContent[] = filteredData.map(item => ({
        ...item,
        status: (item.status as 'active' | 'maintenance' | 'blocked' | 'published' | 'draft') || 'published'
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
    const userLevel = planHierarchy[userPlan] || 0;
    const requiredLevel = planHierarchy[contentPlan as keyof typeof planHierarchy] || 0;
    return userLevel >= requiredLevel;
  };

  const handleContentAccess = async (content: CarouselContent) => {
    if (!canAccess(content.required_plan) || (content.status !== 'active' && content.status !== 'published')) {
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

      // Use callback if available, otherwise use programmatic navigation
      if (onContentSelect) {
        onContentSelect(content.id);
      } else {
        console.log('Carousel navigating to topics with content ID:', content.id);
        const newUrl = `/dashboard?section=topics&content=${content.id}`;
        window.history.pushState({}, '', newUrl);
        // Disparar evento de mudança de estado para atualizar o dashboard
        window.dispatchEvent(new PopStateEvent('popstate'));
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
      case 'active':
      case 'published': return 'bg-success text-white';
      case 'maintenance': return 'bg-warning text-white';
      case 'blocked': return 'bg-destructive text-white';
      case 'draft': return 'bg-muted text-muted-foreground';
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
                             content.status === 'published' ? 'Publicado' :
                             content.status === 'maintenance' ? 'Manutenção' : 
                             content.status === 'draft' ? 'Rascunho' : 'Bloqueado'}
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
                      {canAccess(content.required_plan) && (content.status === 'active' || content.status === 'published') ? (
                        <Button 
                          className="w-full" 
                          onClick={() => handleContentAccess(content)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Acessar
                        </Button>
                      ) : !canAccess(content.required_plan) ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={navigateToPlans}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Upgrade Necessário
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          {content.status === 'maintenance' ? 'Em Manutenção' : 
                           content.status === 'draft' ? 'Rascunho' : 'Indisponível'}
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
                  {canAccess(content.required_plan) && (content.status === 'active' || content.status === 'published') ? (
                    <Button 
                      size="sm"
                      className="w-full" 
                      onClick={() => handleContentAccess(content)}
                    >
                      Acessar
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