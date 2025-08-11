
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, Lock, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  status: 'active' | 'maintenance' | 'blocked';
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentSectionProps {
  type: 'products' | 'tools' | 'courses' | 'rules' | 'coming-soon';
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

  const getContentTypeForQuery = (type: string) => {
    switch (type) {
      case 'products': return 'product';
      case 'tools': return 'tool';
      case 'courses': return 'course';
      case 'rules': return 'tutorial'; // Regras são um tipo especial de tutorial
      case 'coming-soon': return null; // Coming soon busca por data futura
      default: return type;
    }
  };

  const fetchContent = async () => {
    try {
      let query = supabase
        .from('content')
        .select('id, title, description, content_type, status, required_plan, hero_image_url, scheduled_publish_at as release_date, created_at, updated_at')
        .order('created_at', { ascending: false });

      const contentType = getContentTypeForQuery(type);
      
      if (type === 'coming-soon') {
        // Para "coming-soon", buscar por data de lançamento futura
        const today = new Date().toISOString();
        query = query.gte('scheduled_publish_at', today);
      } else if (contentType) {
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

      setContent(data || []);
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
      case 'rules': return 'Regras';
      case 'coming-soon': return 'Em Breve';
      default: return 'Conteúdo';
    }
  };

  const getSectionIcon = () => {
    switch (type) {
      case 'coming-soon': return <Calendar className="w-6 h-6" />;
      case 'rules': return <FileText className="w-6 h-6" />;
      default: return null;
    }
  };

  const canAccess = (contentPlan: string) => {
    return planHierarchy[userPlan] >= planHierarchy[contentPlan as keyof typeof planHierarchy];
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
              {type === 'coming-soon' 
                ? 'Nenhum lançamento programado no momento.' 
                : `Nenhum ${getSectionTitle().toLowerCase()} disponível no momento.`
              }
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
                  <Button className="w-full">
                    {type === 'coming-soon' ? 'Aguardando Lançamento' : 'Acessar'}
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
