import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Gem, Star, Play, ExternalLink, Clock, TrendingUp, BookOpen, Wrench } from "lucide-react";
import { LazyImage } from "./LazyImage";
import { GridSkeleton, SpinnerLoading } from "./OptimizedLoadingStates";
import { useOptimizedQueries } from "@/hooks/useOptimizedQueries";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  status: string;
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  video_url: string | null;
  estimated_duration: number | null;
  difficulty_level: string | null;
  is_featured?: boolean;
  created_at: string;
}

interface OptimizedContentSectionProps {
  contentType: string;
  title: string;
  description: string;
  userPlan: 'free' | 'vip' | 'pro';
  onContentSelect?: (contentId: string) => void;
}

const ContentCard = memo(({ 
  content, 
  userPlan, 
  onContentSelect 
}: { 
  content: Content; 
  userPlan: 'free' | 'vip' | 'pro';
  onContentSelect?: (contentId: string) => void;
}) => {
  const planHierarchy = useMemo(() => ({ 'free': 0, 'vip': 1, 'pro': 2 }), []);
  
  const canAccess = useMemo(() => 
    planHierarchy[userPlan] >= planHierarchy[content.required_plan],
    [userPlan, content.required_plan, planHierarchy]
  );

  const { memoizedToast } = useOptimizedQueries();

  const statusConfig = useMemo(() => ({
    active: { text: "Ativo", color: "bg-green-500 text-white" },
    inactive: { text: "Inativo", color: "bg-gray-500 text-white" },
    coming_soon: { text: "Em Breve", color: "bg-blue-500 text-white" },
    maintenance: { text: "Manutenção", color: "bg-yellow-500 text-white" }
  }), []);

  const planConfig = useMemo(() => ({
    pro: { icon: <Crown className="w-4 h-4" />, color: "bg-plan-pro text-white", text: "PRO" },
    vip: { icon: <Gem className="w-4 h-4" />, color: "bg-plan-vip text-white", text: "VIP" },
    free: { icon: <Star className="w-4 h-4" />, color: "bg-plan-free text-white", text: "FREE" }
  }), []);

  const contentTypeIcon = useMemo(() => {
    switch (content.content_type) {
      case 'courses': return <BookOpen className="w-4 h-4" />;
      case 'tools': return <Wrench className="w-4 h-4" />;
      case 'products': return <TrendingUp className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  }, [content.content_type]);

  const handleAccess = useCallback(async () => {
    if (!canAccess) {
      memoizedToast(
        "Acesso Restrito",
        `Este conteúdo requer plano ${content.required_plan.toUpperCase()}`,
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
            interaction_type: 'content_access',
            target_type: 'content',
            target_id: content.id,
            metadata: { content_type: content.content_type }
          }]);
      }

      if (onContentSelect) {
        onContentSelect(content.id);
      } else if (content.video_url) {
        window.open(content.video_url, '_blank');
      } else {
        memoizedToast("Conteúdo acessado", `Acessando: ${content.title}`);
      }
    } catch (error) {
      console.error('Error accessing content:', error);
      memoizedToast("Erro", "Erro ao acessar conteúdo", 'destructive');
    }
  }, [content, canAccess, onContentSelect, memoizedToast]);

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
      <div className="relative">
        {content.hero_image_url && (
          <LazyImage
            src={content.hero_image_url}
            alt={content.title}
            className="h-48 group-hover:scale-105 transition-transform duration-300"
            placeholderClassName="h-48"
          />
        )}
        
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge className={planConfig[content.required_plan].color}>
            {planConfig[content.required_plan].icon}
            <span className="ml-1">{planConfig[content.required_plan].text}</span>
          </Badge>
          {content.is_featured && (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              ⭐ Destaque
            </Badge>
          )}
        </div>
        
        <div className="absolute top-2 left-2">
          <Badge className={statusConfig[content.status].color}>
            {statusConfig[content.status].text}
          </Badge>
        </div>
      </div>

      <CardHeader className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {content.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {contentTypeIcon}
                <span className="ml-1 capitalize">{content.content_type}</span>
              </Badge>
              {content.estimated_duration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {content.estimated_duration} min
                </div>
              )}
            </div>
          </div>
        </div>
        
        {content.description && (
          <CardDescription className="line-clamp-3 text-sm">
            {content.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {canAccess ? (
          <Button 
            className="w-full" 
            onClick={handleAccess}
            disabled={content.status !== 'active'}
          >
            {content.video_url ? (
              <Play className="w-4 h-4 mr-2" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            {content.status === 'active' ? 'Acessar' : 'Indisponível'}
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

ContentCard.displayName = 'ContentCard';

export const OptimizedContentSection = memo(({ 
  contentType, 
  title, 
  description, 
  userPlan, 
  onContentSelect 
}: OptimizedContentSectionProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchWithErrorHandling } = useOptimizedQueries();

  const fetchContent = useCallback(async () => {
    const data = await fetchWithErrorHandling(
      async () => {
        const { supabase } = await import('@/integrations/supabase/client');
        return supabase
          .from('content')
          .select('*')
          .eq('content_type', contentType as any)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });
      },
      `Falha ao carregar ${title.toLowerCase()}`
    );

    if (data) {
      setContent(data);
    }
    setLoading(false);
  }, [contentType, title, fetchWithErrorHandling]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const contentItems = useMemo(() => 
    content.map((item) => (
      <ContentCard
        key={item.id}
        content={item}
        userPlan={userPlan}
        onContentSelect={onContentSelect}
      />
    )),
    [content, userPlan, onContentSelect]
  );

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <GridSkeleton items={6} />
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 p-4 bg-muted/20 rounded-full">
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo disponível</h3>
          <p className="text-muted-foreground max-w-md">
            Ainda não há conteúdo disponível nesta seção. 
            Novos {title.toLowerCase()} serão adicionados em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contentItems}
      </div>
    </div>
  );
});

OptimizedContentSection.displayName = 'OptimizedContentSection';