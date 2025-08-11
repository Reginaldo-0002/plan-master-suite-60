import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Lock, Play, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Content {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  required_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface ContentSectionProps {
  type: 'product' | 'tool' | 'course' | 'tutorial';
  userPlan: 'free' | 'vip' | 'pro';
}

const planHierarchy = { free: 0, vip: 1, pro: 2 };

export const ContentSection = ({ type, userPlan }: ContentSectionProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'vip' | 'pro'>('all');

  useEffect(() => {
    fetchContent();
  }, [type]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', type)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching content:', error);
        return;
      }

      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (requiredPlan: string) => {
    return planHierarchy[userPlan] >= planHierarchy[requiredPlan as keyof typeof planHierarchy];
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-plan-pro text-white';
      case 'vip':
        return 'bg-plan-vip text-white';
      default:
        return 'bg-plan-free text-white';
    }
  };

  const getTypeTitle = () => {
    switch (type) {
      case 'product':
        return 'Produtos';
      case 'tool':
        return 'Ferramentas';
      case 'course':
        return 'Cursos';
      case 'tutorial':
        return 'Tutoriais';
      default:
        return 'Conteúdo';
    }
  };

  const getTypeDescription = () => {
    switch (type) {
      case 'product':
        return 'Descubra nossos produtos exclusivos e materiais de apoio';
      case 'tool':
        return 'Acesse ferramentas poderosas para acelerar seus resultados';
      case 'course':
        return 'Aprenda com nossos cursos estruturados e completos';
      case 'tutorial':
        return 'Tutoriais passo a passo para dominar nossa plataforma';
      default:
        return 'Explore nosso conteúdo exclusivo';
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesFilter = filterPlan === 'all' || item.required_plan === filterPlan;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-card border-card-border">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold font-heading text-foreground">
            {getTypeTitle()}
          </h1>
          <p className="text-muted-foreground">
            {getTypeDescription()}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${getTypeTitle().toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os planos</option>
              <option value="free">Free</option>
              <option value="vip">VIP</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <Card className="shadow-card border-card-border">
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              {searchTerm || filterPlan !== 'all' 
                ? "Nenhum conteúdo encontrado com os filtros aplicados."
                : `Nenhum ${getTypeTitle().toLowerCase()} disponível no momento.`
              }
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => {
            const hasAccess = canAccess(item.required_plan);
            
            return (
              <Card 
                key={item.id} 
                className={`shadow-card border-card-border transition-all duration-200 hover:shadow-card-hover ${
                  hasAccess ? 'cursor-pointer' : 'opacity-75'
                }`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <Badge className={`${getPlanBadgeColor(item.required_plan)} text-xs shrink-0 ml-2`}>
                      {item.required_plan.toUpperCase()}
                    </Badge>
                  </div>
                  {item.description && (
                    <CardDescription className="line-clamp-3">
                      {item.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {hasAccess ? (
                    <Button 
                      className="w-full gradient-primary"
                      onClick={() => {
                        // TODO: Open content modal or navigate to content page
                        console.log('Open content:', item.id);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Acessar Conteúdo
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Requer plano {item.required_plan.toUpperCase()}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};