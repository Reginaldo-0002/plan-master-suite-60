
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Play, Lock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  required_plan: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ContentSectionProps {
  contentType: 'product' | 'tool' | 'course' | 'tutorial';
  userPlan: 'free' | 'vip' | 'pro';
}

export const ContentSection = ({ contentType, userPlan }: ContentSectionProps) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [filteredContents, setFilteredContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
  }, [contentType]);

  useEffect(() => {
    const filtered = contents.filter(content =>
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (content.description && content.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredContents(filtered);
  }, [contents, searchTerm]);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', contentType)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conteúdos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (content: Content) => {
    const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };
    return planHierarchy[userPlan as keyof typeof planHierarchy] >= 
           planHierarchy[content.required_plan as keyof typeof planHierarchy];
  };

  const openContent = (content: Content) => {
    if (!hasAccess(content)) {
      toast({
        title: "Acesso Restrito",
        description: `Este conteúdo requer o plano ${content.required_plan.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }
    setSelectedContent(content);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeTitle = () => {
    switch (contentType) {
      case 'product': return 'Produtos';
      case 'tool': return 'Ferramentas';
      case 'course': return 'Cursos';
      case 'tutorial': return 'Tutoriais';
      default: return 'Conteúdo';
    }
  };

  const getContentTypeDescription = () => {
    switch (contentType) {
      case 'product': return 'Explore nossos produtos e soluções';
      case 'tool': return 'Acesse ferramentas úteis para seu dia a dia';
      case 'course': return 'Aprenda com nossos cursos especializados';
      case 'tutorial': return 'Guias passo a passo para ajudar você';
      default: return 'Conteúdo disponível na plataforma';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando conteúdos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {getContentTypeTitle()}
          </h2>
          <p className="text-muted-foreground">
            {getContentTypeDescription()}
          </p>
        </div>
        <Badge className={getPlanBadgeColor(userPlan)}>
          Plano {userPlan.toUpperCase()}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Buscar ${getContentTypeTitle().toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredContents.map((content) => (
          <Card key={content.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{content.title}</CardTitle>
                {!hasAccess(content) && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Badge className={getPlanBadgeColor(content.required_plan)}>
                {content.required_plan.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {content.description || "Sem descrição disponível"}
              </CardDescription>
              <Button 
                onClick={() => openContent(content)}
                className="w-full"
                variant={hasAccess(content) ? "default" : "outline"}
                disabled={!hasAccess(content)}
              >
                {hasAccess(content) ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Acessar
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Upgrade Necessário
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContents.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm 
              ? `Nenhum resultado encontrado para "${searchTerm}"` 
              : `Nenhum ${getContentTypeTitle().toLowerCase()} disponível no momento`
            }
          </p>
        </div>
      )}

      {/* Content Viewer Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title}</DialogTitle>
            <DialogDescription>
              {selectedContent?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedContent?.video_url ? (
              <div className="aspect-video">
                <iframe
                  src={selectedContent.video_url}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  title={selectedContent.title}
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Conteúdo em desenvolvimento
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
