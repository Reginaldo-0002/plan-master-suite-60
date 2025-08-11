
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, Lock, Calendar, FileText, Play, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  status: 'active' | 'maintenance' | 'blocked';
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  video_url: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentSectionProps {
  type: 'products' | 'tools' | 'courses' | 'tutorials' | 'rules' | 'coming-soon' | 'carousel';
  userPlan: 'free' | 'vip' | 'pro';
}

export const ContentSection = ({ type, userPlan }: ContentSectionProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };

  useEffect(() => {
    fetchContent();
  }, [type]);

  const getContentTypeForQuery = (type: string): 'product' | 'tool' | 'course' | 'tutorial' | null => {
    switch (type) {
      case 'products': return 'product';
      case 'tools': return 'tool';
      case 'courses': return 'course';
      case 'tutorials': return 'tutorial';
      case 'rules': return null; // Rules should use admin_settings
      case 'carousel': return null; // Special case for carousel content
      default: return null;
    }
  };

  const fetchContent = async () => {
    try {
      let query = supabase
        .from('content')
        .select('id, title, description, content_type, status, required_plan, hero_image_url, video_url, scheduled_publish_at, created_at, updated_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const contentType = getContentTypeForQuery(type);
      
      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching content:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar conteúdo",
          variant: "destructive",
        });
        return;
      }

      const mappedData: Content[] = (data || []).map(item => ({
        ...item,
        status: (item.status as 'active' | 'maintenance' | 'blocked') || 'active',
        release_date: item.scheduled_publish_at
      }));

      setContent(mappedData);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar conteúdo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccessContent = async (contentItem: Content) => {
    if (!canAccess(contentItem.required_plan) || contentItem.status !== 'active') {
      return;
    }

    try {
      // Log user interaction
      await supabase
        .from('user_interactions')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          interaction_type: 'content_access',
          target_type: 'content',
          target_id: contentItem.id,
          metadata: { content_type: contentItem.content_type }
        }]);

      // Check if content has topics/gallery
      const { data: topics } = await supabase
        .from('content_topics')
        .select('id')
        .eq('content_id', contentItem.id)
        .eq('is_active', true)
        .limit(1);

      if (topics && topics.length > 0) {
        // Navigate to topics gallery
        window.location.href = `/carousel?content=${contentItem.id}`;
        return;
      }

      // Open video or external link
      if (contentItem.video_url) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-white';
      case 'maintenance': return 'bg-warning text-white';
      case 'blocked': return 'bg-destructive text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'maintenance': return 'Manutenção';
      case 'blocked': return 'Bloqueado';
      default: return status;
    }
  };

  const getSectionTitle = () => {
    switch (type) {
      case 'products': return 'Produtos';
      case 'tools': return 'Ferramentas';
      case 'courses': return 'Cursos';
      case 'tutorials': return 'Tutoriais';
      case 'rules': return 'Regras';
      case 'coming-soon': return 'Em Breve';
      case 'carousel': return 'Carrossel';
      default: return 'Conteúdo';
    }
  };

  const getSectionIcon = () => {
    switch (type) {
      case 'rules': return <FileText className="w-6 h-6" />;
      default: return null;
    }
  };

  const canAccess = (contentPlan: string) => {
    return planHierarchy[userPlan] >= planHierarchy[contentPlan as keyof typeof planHierarchy];
  };

  const getActionIcon = (contentItem: Content) => {
    if (contentItem.video_url) {
      return <Play className="w-4 h-4 mr-2" />;
    }
    return <ExternalLink className="w-4 h-4 mr-2" />;
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
        {getSectionIcon()}
        <h1 className="text-3xl font-bold text-foreground">{getSectionTitle()}</h1>
      </div>

      {content.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum {getSectionTitle().toLowerCase()} disponível no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {content.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {item.hero_image_url && (
                <div className="h-48 bg-cover bg-center" 
                     style={{ backgroundImage: `url(${item.hero_image_url})` }} />
              )}
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex flex-col gap-2">
                    <Badge className={getPlanColor(item.required_plan)}>
                      {getPlanIcon(item.required_plan)}
                      <span className="ml-1 uppercase">{item.required_plan}</span>
                    </Badge>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusText(item.status)}
                    </Badge>
                  </div>
                </div>
                {item.description && (
                  <CardDescription>{item.description}</CardDescription>
                )}
                {item.release_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Lançamento: {new Date(item.release_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {canAccess(item.required_plan) && item.status === 'active' ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleAccessContent(item)}
                  >
                    {getActionIcon(item)}
                    Acessar
                  </Button>
                ) : !canAccess(item.required_plan) ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Lock className="w-4 h-4 mr-2" />
                    Upgrade Necessário
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    {getStatusText(item.status)}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
