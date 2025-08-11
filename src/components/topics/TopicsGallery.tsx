
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Play, FileText, Link, Unlock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  topic_image_url: string | null;
  topic_order: number;
}

interface Resource {
  id: string;
  resource_type: 'video' | 'pdf' | 'link' | 'unlock_link';
  title: string;
  resource_url: string;
  description: string | null;
  thumbnail_url: string | null;
  resource_order: number;
  is_premium: boolean;
  required_plan: 'free' | 'vip' | 'pro';
}

interface TopicsGalleryProps {
  contentId: string;
  userPlan: 'free' | 'vip' | 'pro';
  onBack: () => void;
}

export const TopicsGallery = ({ contentId, userPlan, onBack }: TopicsGalleryProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTopics();
  }, [contentId]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_topics')
        .select('*')
        .eq('content_id', contentId)
        .eq('is_active', true)
        .order('topic_order', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tópicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async (topicId: string) => {
    try {
      setResourcesLoading(true);
      const { data, error } = await supabase
        .from('topic_resources')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .order('resource_order', { ascending: true });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar recursos",
        variant: "destructive",
      });
    } finally {
      setResourcesLoading(false);
    }
  };

  const openTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    fetchResources(topic.id);
  };

  const hasAccess = (resource: Resource) => {
    const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };
    return planHierarchy[userPlan] >= planHierarchy[resource.required_plan];
  };

  const openResource = (resource: Resource) => {
    if (resource.is_premium && !hasAccess(resource)) {
      toast({
        title: "Acesso Restrito",
        description: `Este recurso requer o plano ${resource.required_plan.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }
    window.open(resource.resource_url, '_blank');
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'link': return <Link className="w-5 h-5" />;
      case 'unlock_link': return <Unlock className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando tópicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Tópicos
          </h2>
          <p className="text-muted-foreground">
            Selecione um tópico para ver os recursos disponíveis
          </p>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <Card key={topic.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="relative aspect-video overflow-hidden rounded-t-lg">
                <img
                  src={topic.topic_image_url || '/placeholder.svg'}
                  alt={topic.title}
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: '16/9' }}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => openTopic(topic)}
                    className="bg-white/90 text-black hover:bg-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Recursos
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{topic.title}</h3>
                {topic.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {topic.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum tópico disponível no momento
          </p>
        </div>
      )}

      {/* Resources Dialog */}
      <Dialog open={!!selectedTopic} onOpenChange={() => setSelectedTopic(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTopic?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTopic?.description && (
              <p className="text-muted-foreground">{selectedTopic.description}</p>
            )}
            
            {resourcesLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando recursos...</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {resources.map((resource) => (
                  <Card key={resource.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getResourceIcon(resource.resource_type)}
                          <CardTitle className="text-base">{resource.title}</CardTitle>
                        </div>
                        {resource.is_premium && !hasAccess(resource) && (
                          <Badge className={getPlanBadgeColor(resource.required_plan)}>
                            {resource.required_plan.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      {resource.description && (
                        <CardDescription>{resource.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button 
                        onClick={() => openResource(resource)}
                        className="w-full"
                        variant={resource.is_premium && !hasAccess(resource) ? "outline" : "default"}
                      >
                        {resource.is_premium && !hasAccess(resource) ? "Upgrade Necessário" : "Acessar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!resourcesLoading && resources.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum recurso disponível neste tópico
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
