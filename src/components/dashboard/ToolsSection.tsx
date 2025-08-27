import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Loader2, Crown, Gem, Star, Lock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAreaTracking } from "@/hooks/useAreaTracking";
import { useOptimizedNavigation } from "@/hooks/useOptimizedNavigation";

interface Tool {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'blocked';
  message: string | null;
  url?: string;
  description?: string;
  required_plan?: 'free' | 'vip' | 'pro';
  hero_image_url?: string;
}

interface ToolsSectionProps {
  userPlan: 'free' | 'vip' | 'pro';
  onContentSelect?: (contentId: string) => void;
}

export const ToolsSection = ({ userPlan, onContentSelect }: ToolsSectionProps) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { trackAreaAccess } = useAreaTracking();
  const { navigateToPlans } = useOptimizedNavigation();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };

  useEffect(() => {
    fetchTools();
    
    // Track area access when accessing tools section
    trackAreaAccess('Tools');
    
    // Real-time updates para tool_status
    const channel = supabase
      .channel('tools-status-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tool_status'
      }, () => {
        fetchTools();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackAreaAccess]);

  const fetchTools = async () => {
    try {
      console.log('🔄 Fetching tools data...');
      
      // Verificar usuário atual para debug
      const currentUser = await supabase.auth.getUser();
      console.log('👤 Current user ID for tools:', currentUser.data.user?.id);
      
      const { data: contentData, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'tool')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching tools:', error);
        return;
      }

      console.log('📋 Content data fetched (before filtering):', contentData);
      
      // Filtrar manualmente conteúdo oculto para garantir
      let filteredContentData = contentData || [];
      
      if (currentUser.data.user?.id) {
        const { data: hiddenContent } = await supabase
          .from('content_visibility_rules')
          .select('content_id')
          .eq('user_id', currentUser.data.user.id)
          .eq('is_visible', false);
          
        const hiddenContentIds = hiddenContent?.map(rule => rule.content_id) || [];
        console.log('🚫 Hidden tool IDs for user:', hiddenContentIds);
        
        // Filtrar conteúdo oculto
        filteredContentData = filteredContentData.filter(item => !hiddenContentIds.includes(item.id));
        
        console.log('✅ Tools after manual filtering:', { 
          count: filteredContentData.length, 
          items: filteredContentData.map(item => ({ id: item.id, title: item.title }))
        });
      }

      // Fetch tool statuses
      const { data: statusData } = await supabase
        .from('tool_status')
        .select('*');

      console.log('📊 Status data fetched:', statusData);

      const toolsWithStatus = filteredContentData.map(tool => {
        const status = statusData?.find(s => s.tool_name === tool.title);
        
        console.log(`🔧 Processing tool: ${tool.title}`, {
          hero_image_url: tool.hero_image_url,
          status: status?.status || 'active',
          required_plan: tool.required_plan
        });

        return {
          id: tool.id,
          name: tool.title,
          status: (status?.status || 'active') as 'active' | 'maintenance' | 'blocked',
          message: status?.message || null,
          url: tool.video_url,
          description: tool.description,
          required_plan: tool.required_plan,
          hero_image_url: tool.hero_image_url // Usando diretamente o hero_image_url do content
        };
      });

      console.log('✅ Final tools with status:', toolsWithStatus);
      setTools(toolsWithStatus);
    } catch (error) {
      console.error('💥 Error in fetchTools:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (tool: Tool) => {
    const userPlanLevel = planHierarchy[userPlan];
    const requiredPlanLevel = planHierarchy[tool.required_plan || 'free'];
    return userPlanLevel >= requiredPlanLevel;
  };

  const handleAccessTool = async (tool: Tool) => {
    try {
      // Track area access when accessing tool
      trackAreaAccess(`Tool-${tool.id}`);
      
      // Log da tentativa de acesso à ferramenta
      await supabase
        .from('content_analytics')
        .insert({
          content_id: tool.id,
          interaction_type: 'tool_access'
        });

      // Se o usuário pode acessar e a ferramenta está ativa
      if (canAccess(tool) && tool.status === 'active') {
        if (onContentSelect) {
          onContentSelect(tool.id);
        } else if (tool.url) {
          window.open(tool.url, '_blank');
        }
        
        toast({
          title: "Ferramenta acessada",
          description: `Redirecionando para ${tool.name}...`,
        });
      } else if (!canAccess(tool)) {
        navigateToPlans();
      } else {
        // Ferramenta indisponível
        toast({
          title: "Ferramenta indisponível",
          description: tool.message || "Esta ferramenta está temporariamente indisponível.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accessing tool:', error);
    }
  };

  const getPlanIcon = (plan?: string) => {
    switch (plan) {
      case 'free':
        return <Star className="h-4 w-4 text-muted-foreground" />;
      case 'vip':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'pro':
        return <Gem className="h-4 w-4 text-purple-500" />;
      default:
        return <Star className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPlanColor = (plan?: string) => {
    switch (plan) {
      case 'free':
        return 'text-muted-foreground';
      case 'vip':
        return 'text-amber-600';
      case 'pro':
        return 'text-purple-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'maintenance':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'maintenance':
        return 'Manutenção';
      case 'blocked':
        return 'Bloqueado';
      default:
        return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando ferramentas...</span>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-2">Nenhuma ferramenta disponível</h3>
        <p className="text-muted-foreground">
          Não há ferramentas configuradas no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Ferramentas Disponíveis</h2>
        <p className="text-muted-foreground">
          Acesse nossas ferramentas exclusivas baseadas no seu plano atual
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card key={tool.id} className="transition-all duration-200 hover:shadow-lg">
            <CardHeader className="space-y-4">
              {/* Hero Image Display */}
              {tool.hero_image_url && (
                <div className="w-full h-48 rounded-lg overflow-hidden">
                  <img 
                    src={tool.hero_image_url} 
                    alt={tool.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`❌ Failed to load image for ${tool.name}:`, tool.hero_image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log(`✅ Image loaded successfully for ${tool.name}:`, tool.hero_image_url);
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {tool.name}
                </CardTitle>
                <div className="flex gap-2">
                  {getPlanIcon(tool.required_plan)}
                  <Badge variant={getStatusColor(tool.status)}>
                    {getStatusText(tool.status)}
                  </Badge>
                </div>
              </div>
              {tool.description && (
                <CardDescription className="text-muted-foreground">
                  {tool.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${getPlanColor(tool.required_plan)}`}>
                  Plano {tool.required_plan?.toUpperCase() || 'FREE'}
                </span>
                {!canAccess(tool) && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {tool.message && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {tool.message}
                </p>
              )}

              <Button
                onClick={() => {
                  if (canAccess(tool) && tool.status === 'active') {
                    handleAccessTool(tool);
                  } else if (!canAccess(tool)) {
                    navigateToPlans();
                  }
                }}
                className="w-full"
                variant={canAccess(tool) && tool.status === 'active' ? 'default' : 'outline'}
                disabled={tool.status === 'blocked' || tool.status === 'maintenance'}
              >
                {tool.status === 'blocked' ? (
                  'Bloqueado'
                ) : tool.status === 'maintenance' ? (
                  'Em Manutenção'
                ) : !canAccess(tool) ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Upgrade Necessário
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Acessar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};