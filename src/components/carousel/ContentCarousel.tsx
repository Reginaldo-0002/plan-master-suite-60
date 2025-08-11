import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CarouselContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  status: 'active' | 'maintenance' | 'blocked';
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  carousel_image_url: string | null;
  carousel_order: number;
  created_at: string;
  updated_at: string;
}

interface ContentCarouselProps {
  userPlan?: 'free' | 'vip' | 'pro';
  onContentClick?: (contentId: string) => void;
}

export const ContentCarousel = ({ userPlan, onContentClick }: ContentCarouselProps) => {
  const [carouselContent, setCarouselContent] = useState<CarouselContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchCarouselContent();
  }, []);

  const fetchCarouselContent = async () => {
    try {
      console.log('Fetching carousel content...');
      
      const { data, error } = await supabase
        .from('content')
        .select('id, title, description, content_type, status, required_plan, hero_image_url, carousel_image_url, carousel_order, created_at, updated_at')
        .eq('show_in_carousel', true)
        .eq('is_active', true)
        .order('carousel_order', { ascending: true });

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

      // Type assertion para garantir que status seja do tipo correto
      const typedData = (data || []).map(item => ({
        ...item,
        status: (item.status as 'active' | 'maintenance' | 'blocked') || 'active'
      }));

      setCarouselContent(typedData);
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

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % carouselContent.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + carouselContent.length) % carouselContent.length);
  };

  const handleContentClick = (contentId: string) => {
    if (onContentClick) {
      onContentClick(contentId);
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
      </div>

      {carouselContent.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Images className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo no carrossel</h3>
            <p className="text-muted-foreground">
              Não há conteúdo configurado para exibição no carrossel no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Carousel Principal */}
          <div className="relative">
            <Card className="overflow-hidden">
              <div className="relative h-96">
                {carouselContent[currentIndex]?.carousel_image_url || carouselContent[currentIndex]?.hero_image_url ? (
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ 
                      backgroundImage: `url(${carouselContent[currentIndex]?.carousel_image_url || carouselContent[currentIndex]?.hero_image_url})` 
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10" />
                )}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{carouselContent[currentIndex]?.title}</h2>
                      {carouselContent[currentIndex]?.description && (
                        <p className="text-white/90 mb-4">{carouselContent[currentIndex]?.description}</p>
                      )}
                    </div>
                    <Badge className={getPlanColor(carouselContent[currentIndex]?.required_plan)}>
                      {getPlanIcon(carouselContent[currentIndex]?.required_plan)}
                      <span className="ml-1 uppercase">{carouselContent[currentIndex]?.required_plan}</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation Buttons */}
            {carouselContent.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={prevSlide}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={nextSlide}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Indicators */}
          {carouselContent.length > 1 && (
            <div className="flex justify-center gap-2">
              {carouselContent.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}

          {/* Grid de Conteúdo do Carrossel */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {carouselContent.map((item, index) => (
              <Card key={item.id} className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                index === currentIndex ? 'ring-2 ring-primary' : ''
              }`}>
                {(item.carousel_image_url || item.hero_image_url) && (
                  <div className="h-48 bg-cover bg-center" 
                       style={{ backgroundImage: `url(${item.carousel_image_url || item.hero_image_url})` }} />
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
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setCurrentIndex(index);
                      handleContentClick(item.id);
                    }}
                  >
                    {index === currentIndex ? 'Visualizando' : 'Ver no Carrossel'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
