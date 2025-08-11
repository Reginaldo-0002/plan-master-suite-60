
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Video, FileText, Lock, Play, BookOpen } from "lucide-react";
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
}

interface ContentSectionProps {
  userPlan: string;
}

export const ContentSection = ({ userPlan }: ContentSectionProps) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
    
    const channel = supabase
      .channel('content-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content'
      }, () => {
        fetchContents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
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

  const canAccessContent = (requiredPlan: string) => {
    const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };
    return planHierarchy[userPlan as keyof typeof planHierarchy] >= planHierarchy[requiredPlan as keyof typeof planHierarchy];
  };

  const openContentViewer = (content: Content) => {
    if (!canAccessContent(content.required_plan)) {
      toast({
        title: "Acesso Restrito",
        description: `Este conteúdo requer plano ${content.required_plan.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedContent(content);
    setIsViewerOpen(true);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'course': return <BookOpen className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const freeContents = contents.filter(c => c.required_plan === 'free');
  const vipContents = contents.filter(c => c.required_plan === 'vip');
  const proContents = contents.filter(c => c.required_plan === 'pro');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Conteúdos Disponíveis</h2>
        <p className="text-muted-foreground">
          Acesse vídeos, cursos e materiais exclusivos baseados no seu plano
        </p>
      </div>

      {/* Free Content */}
      {freeContents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Conteúdo Gratuito</h3>
            <Badge className="bg-gray-100 text-gray-800">FREE</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {freeContents.map((content) => (
              <Card key={content.id} className="border-border cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(content.content_type)}
                      <Badge className={getPlanBadgeColor(content.required_plan)}>
                        {content.required_plan.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg text-foreground">{content.title}</CardTitle>
                  {content.description && (
                    <CardDescription className="text-sm">
                      {content.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => openContentViewer(content)}
                    className="w-full"
                    variant="outline"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Acessar Conteúdo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VIP Content */}
      {vipContents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Conteúdo VIP</h3>
            <Badge className="bg-blue-100 text-blue-800">VIP</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vipContents.map((content) => (
              <Card key={content.id} className="border-border cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(content.content_type)}
                      <Badge className={getPlanBadgeColor(content.required_plan)}>
                        {content.required_plan.toUpperCase()}
                      </Badge>
                    </div>
                    {!canAccessContent(content.required_plan) && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-lg text-foreground">{content.title}</CardTitle>
                  {content.description && (
                    <CardDescription className="text-sm">
                      {content.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => openContentViewer(content)}
                    className="w-full"
                    variant={canAccessContent(content.required_plan) ? "outline" : "secondary"}
                    disabled={!canAccessContent(content.required_plan)}
                  >
                    {canAccessContent(content.required_plan) ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Acessar Conteúdo
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
        </div>
      )}

      {/* Pro Content */}
      {proContents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Conteúdo PRO</h3>
            <Badge className="bg-purple-100 text-purple-800">PRO</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {proContents.map((content) => (
              <Card key={content.id} className="border-border cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(content.content_type)}
                      <Badge className={getPlanBadgeColor(content.required_plan)}>
                        {content.required_plan.toUpperCase()}
                      </Badge>
                    </div>
                    {!canAccessContent(content.required_plan) && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-lg text-foreground">{content.title}</CardTitle>
                  {content.description && (
                    <CardDescription className="text-sm">
                      {content.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => openContentViewer(content)}
                    className="w-full"
                    variant={canAccessContent(content.required_plan) ? "outline" : "secondary"}
                    disabled={!canAccessContent(content.required_plan)}
                  >
                    {canAccessContent(content.required_plan) ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Acessar Conteúdo
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
        </div>
      )}

      {/* Content Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedContent && getContentTypeIcon(selectedContent.content_type)}
              {selectedContent?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedContent?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              {selectedContent.content_type === 'video' && selectedContent.video_url && (
                <div className="aspect-video">
                  <iframe
                    src={selectedContent.video_url}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                    title={selectedContent.title}
                  />
                </div>
              )}
              
              {selectedContent.content_type === 'text' && (
                <div className="prose max-w-none">
                  <p className="text-foreground">
                    {selectedContent.description}
                  </p>
                </div>
              )}
              
              {selectedContent.content_type === 'course' && (
                <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Curso Completo</h3>
                  <p className="text-muted-foreground">
                    Este é um curso completo com múltiplas lições e exercícios práticos.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
