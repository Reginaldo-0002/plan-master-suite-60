import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit, Plus, Upload, ExternalLink, Video, FileText, AlertCircle, CheckCircle, Eye, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  topic_order: number;
  is_active: boolean;
  content_id: string;
  topic_image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: 'link' | 'video' | 'pdf' | 'unlock_link';
  resource_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  is_premium: boolean;
  required_plan: string;
  resource_order: number;
  topic_id: string;
  created_at: string;
  updated_at: string;
}

interface ContentTopicsEditorProps {
  contentId: string;
  onSave: () => void;
}

export const ContentTopicsEditor = ({ contentId, onSave }: ContentTopicsEditorProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  
  // Topic form states
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicImageUrl, setTopicImageUrl] = useState("");
  
  // Resource form states
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceType, setResourceType] = useState<Resource['resource_type']>("video");
  const [resourceUrl, setResourceUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isResourcePremium, setIsResourcePremium] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState("free");
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; message: string }>({ isValid: true, message: "" });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTopics();
  }, [contentId]);

  useEffect(() => {
    if (activeTopic) {
      fetchResources(activeTopic);
    }
  }, [activeTopic]);

  // Validação de URL em tempo real
  useEffect(() => {
    if (resourceUrl.trim()) {
      validateUrl(resourceUrl, resourceType);
    } else {
      setUrlValidation({ isValid: true, message: "" });
    }
  }, [resourceUrl, resourceType]);

  const validateUrl = (url: string, type: Resource['resource_type']) => {
    try {
      new URL(url);
      
      let isValid = true;
      let message = "";
      
      console.log('🔍 Validating URL:', url, 'for type:', type);
      
      if (type === 'video') {
        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
        const isVimeo = url.includes('vimeo.com');
        const isMp4 = url.includes('.mp4');
        
        if (!isYoutube && !isVimeo && !isMp4) {
          isValid = false;
          message = "URL deve ser do YouTube, Vimeo ou arquivo .mp4";
        } else {
          message = isYoutube ? "✓ YouTube detectado" : isVimeo ? "✓ Vimeo detectado" : "✓ Arquivo de vídeo detectado";
        }
      } else if (type === 'pdf') {
        if (!url.includes('.pdf') && !url.includes('drive.google.com') && !url.includes('dropbox.com')) {
          isValid = false;
          message = "URL deve ser um arquivo PDF ou link do Google Drive/Dropbox";
        } else {
          message = "✓ Arquivo PDF detectado";
        }
      } else {
        message = "✓ URL válida";
      }
      
      setUrlValidation({ isValid, message });
    } catch {
      setUrlValidation({ isValid: false, message: "URL inválida" });
    }
  };

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('content_topics')
        .select('*')
        .eq('content_id', contentId)
        .eq('is_active', true)
        .order('topic_order', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
      
      if (data && data.length > 0 && !activeTopic) {
        setActiveTopic(data[0].id);
      }
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
      const { data, error } = await supabase
        .from('topic_resources')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .order('resource_order', { ascending: true });

      if (error) throw error;
      
      // Transform the data to ensure proper typing
      const typedResources: Resource[] = (data || []).map(item => ({
        ...item,
        resource_type: item.resource_type as Resource['resource_type']
      }));
      
      setResources(typedResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar recursos",
        variant: "destructive",
      });
    }
  };

  const createTopic = async () => {
    if (!topicTitle.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Título do tópico é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('content_topics')
        .insert([{
          title: topicTitle.trim(),
          description: topicDescription.trim() || null,
          content_id: contentId,
          topic_image_url: topicImageUrl.trim() || null,
          topic_order: topics.length,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Tópico "${topicTitle}" criado com sucesso`,
      });

      setIsTopicDialogOpen(false);
      clearTopicForm();
      fetchTopics();
      onSave();
    } catch (error: any) {
      console.error('Error creating topic:', error);
      toast({
        title: "Erro ao criar tópico",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    }
  };

  const updateTopic = async () => {
    if (!selectedTopic) return;

    try {
      const { error } = await supabase
        .from('content_topics')
        .update({
          title: topicTitle,
          description: topicDescription,
          topic_image_url: topicImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTopic.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico atualizado com sucesso",
      });

      setIsTopicDialogOpen(false);
      clearTopicForm();
      fetchTopics();
      onSave();
    } catch (error: any) {
      console.error('Error updating topic:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar tópico",
        variant: "destructive",
      });
    }
  };

  const createResource = async () => {
    const errors = [];
    if (!resourceTitle.trim()) errors.push("Título");
    if (!resourceUrl.trim()) errors.push("URL");
    if (!activeTopic) errors.push("Tópico selecionado");
    if (!urlValidation.isValid) errors.push("URL válida");

    if (errors.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Os seguintes campos são obrigatórios: ${errors.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('topic_resources')
        .insert([{
          title: resourceTitle.trim(),
          description: resourceDescription.trim() || null,
          resource_type: resourceType,
          resource_url: resourceUrl.trim(),
          thumbnail_url: thumbnailUrl.trim() || null,
          is_premium: isResourcePremium,
          required_plan: requiredPlan,
          topic_id: activeTopic,
          resource_order: resources.length,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Recurso adicionado!",
        description: `"${resourceTitle}" foi adicionado ao tópico`,
      });

      setIsResourceDialogOpen(false);
      clearResourceForm();
      fetchResources(activeTopic);
      onSave();
    } catch (error: any) {
      console.error('Error creating resource:', error);
      toast({
        title: "Erro ao criar recurso",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    }
  };

  const updateResource = async () => {
    if (!selectedResource) return;

    try {
      const { error } = await supabase
        .from('topic_resources')
        .update({
          title: resourceTitle,
          description: resourceDescription,
          resource_type: resourceType,
          resource_url: resourceUrl,
          thumbnail_url: thumbnailUrl,
          is_premium: isResourcePremium,
          required_plan: requiredPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedResource.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso atualizado com sucesso",
      });

      setIsResourceDialogOpen(false);
      clearResourceForm();
      fetchResources(activeTopic!);
      onSave();
    } catch (error: any) {
      console.error('Error updating resource:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar recurso",
        variant: "destructive",
      });
    }
  };

  const deleteTopic = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!confirm(`Tem certeza que deseja excluir o tópico "${topic?.title}"?\n\nEsta ação não pode ser desfeita e todos os recursos do tópico também serão removidos.`)) return;

    try {
      const { error } = await supabase
        .from('content_topics')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: "Tópico excluído",
        description: "O tópico foi removido com sucesso",
      });

      if (activeTopic === topicId) {
        setActiveTopic(null);
        setResources([]);
      }
      fetchTopics();
      onSave();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast({
        title: "Erro ao excluir tópico",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    }
  };

  const deleteResource = async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!confirm(`Tem certeza que deseja excluir o recurso "${resource?.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('topic_resources')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', resourceId);

      if (error) throw error;

      toast({
        title: "Recurso excluído",
        description: "O recurso foi removido com sucesso",
      });

      fetchResources(activeTopic!);
      onSave();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Erro ao excluir recurso",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    }
  };

  const openTopicEditDialog = (topic: Topic) => {
    setSelectedTopic(topic);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description || "");
    setTopicImageUrl(topic.topic_image_url || "");
    setIsTopicDialogOpen(true);
  };

  const openResourceEditDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setResourceTitle(resource.title);
    setResourceDescription(resource.description || "");
    setResourceType(resource.resource_type);
    setResourceUrl(resource.resource_url);
    setThumbnailUrl(resource.thumbnail_url || "");
    setIsResourcePremium(resource.is_premium);
    setRequiredPlan(resource.required_plan);
    setIsResourceDialogOpen(true);
  };

  const clearTopicForm = () => {
    setSelectedTopic(null);
    setTopicTitle("");
    setTopicDescription("");
    setTopicImageUrl("");
  };

  const clearResourceForm = () => {
    setSelectedResource(null);
    setResourceTitle("");
    setResourceDescription("");
    setResourceType("video");
    setResourceUrl("");
    setThumbnailUrl("");
    setIsResourcePremium(false);
    setRequiredPlan("free");
    setUrlValidation({ isValid: true, message: "" });
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'unlock_link': return <Link2 className="w-4 h-4" />;
      case 'link': 
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    const colors = {
      video: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      pdf: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      link: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      unlock_link: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    };
    return colors[type as keyof typeof colors] || colors.link;
  };

  const getResourceTypeLabel = (type: string) => {
    const labels = {
      video: 'Vídeo',
      pdf: 'PDF',
      link: 'Link',
      unlock_link: 'Link de Desbloqueio'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futuristic-primary"></div>
        <p className="text-muted-foreground">Carregando tópicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-futuristic-primary">Gestão de Tópicos</h3>
          <p className="text-muted-foreground">Organize o conteúdo em tópicos e adicione recursos como vídeos, PDFs e links</p>
        </div>
        <Button 
          onClick={() => setIsTopicDialogOpen(true)}
          className="bg-futuristic-gradient hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Tópico
        </Button>
      </div>

      {topics.length === 0 ? (
        <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-2">Nenhum tópico criado ainda</h4>
              <p className="text-muted-foreground mb-4">
                Comece criando o primeiro tópico para organizar o conteúdo
              </p>
              <Button 
                onClick={() => setIsTopicDialogOpen(true)}
                className="bg-futuristic-gradient hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Tópico
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topics Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-futuristic-accent">Tópicos ({topics.length})</h4>
            </div>
            {topics.map((topic) => (
              <Card 
                key={topic.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeTopic === topic.id 
                    ? 'ring-2 ring-futuristic-primary bg-futuristic-primary/5' 
                    : 'hover:bg-background/80'
                }`}
                onClick={() => setActiveTopic(topic.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{topic.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTopicEditDialog(topic);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTopic(topic.id);
                        }}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {topic.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Ordem: {topic.topic_order}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Resources Content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-futuristic-accent">
                {activeTopic && topics.find(t => t.id === activeTopic) ? (
                  <>
                    Recursos - {topics.find(t => t.id === activeTopic)?.title}
                    <Badge variant="outline" className="ml-2">
                      {resources.length} recursos
                    </Badge>
                  </>
                ) : (
                  "Selecione um tópico"
                )}
              </h4>
              <Button 
                onClick={() => setIsResourceDialogOpen(true)}
                disabled={!activeTopic}
                className="bg-futuristic-gradient hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Recurso
              </Button>
            </div>

            {activeTopic ? (
              resources.length === 0 ? (
                <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20">
                  <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <h5 className="font-medium mb-1">Nenhum recurso adicionado</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        Adicione vídeos, PDFs, links ou outros materiais a este tópico
                      </p>
                      <Button 
                        onClick={() => setIsResourceDialogOpen(true)}
                        size="sm"
                        className="bg-futuristic-gradient hover:opacity-90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Recurso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {resources.map((resource) => (
                    <Card key={resource.id} className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20">
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getResourceIcon(resource.resource_type)}
                            <CardTitle className="text-sm font-medium">{resource.title}</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openResourceEditDialog(resource)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteResource(resource.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {resource.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getResourceTypeBadge(resource.resource_type)}>
                            {getResourceTypeLabel(resource.resource_type)}
                          </Badge>
                          {resource.is_premium && (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Premium</Badge>
                          )}
                          <Badge variant="outline">{resource.required_plan.toUpperCase()}</Badge>
                        </div>
                        {resource.thumbnail_url && (
                          <img
                            src={resource.thumbnail_url}
                            alt={resource.title}
                            className="w-full h-20 object-cover rounded mt-3 border border-border"
                          />
                        )}
                        <div className="mt-3 pt-3 border-t border-border">
                          <a 
                            href={resource.resource_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-futuristic-accent hover:underline truncate block flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Visualizar recurso
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <Card className="bg-background/60 backdrop-blur-sm border-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <h4 className="text-lg font-semibold mb-2">Selecione um tópico</h4>
                    <p className="text-muted-foreground">
                      Escolha um tópico na lista ao lado para visualizar e gerenciar seus recursos
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Topic Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-futuristic-primary">
              {selectedTopic ? 'Editar Tópico' : 'Novo Tópico'}
            </DialogTitle>
            <DialogDescription>
              {selectedTopic ? 'Altere os detalhes do tópico' : 'Crie um novo tópico para organizar o conteúdo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic-title">Título *</Label>
              <Input
                id="topic-title"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Ex: Introdução ao Tema"
                className={!topicTitle.trim() && isTopicDialogOpen ? "border-destructive" : ""}
              />
              {!topicTitle.trim() && isTopicDialogOpen && (
                <p className="text-xs text-destructive mt-1">Título é obrigatório</p>
              )}
            </div>
            <div>
              <Label htmlFor="topic-description">Descrição</Label>
              <Textarea
                id="topic-description"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                placeholder="Descrição opcional do tópico"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="topic-image">URL da Imagem (opcional)</Label>
              <Input
                id="topic-image"
                value={topicImageUrl}
                onChange={(e) => setTopicImageUrl(e.target.value)}
                placeholder="https://cdn.site.com/imagem.jpg"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={selectedTopic ? updateTopic : createTopic} 
                className="flex-1 bg-futuristic-gradient hover:opacity-90"
                disabled={!topicTitle.trim()}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {selectedTopic ? 'Atualizar' : 'Criar'} Tópico
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsTopicDialogOpen(false);
                  clearTopicForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Resource Dialog */}
      <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-futuristic-accent">
              {selectedResource ? 'Editar Recurso' : 'Novo Recurso'}
            </DialogTitle>
            <DialogDescription>
              {selectedResource ? 'Altere os detalhes do recurso' : 'Adicione um novo recurso ao tópico selecionado'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics">Informações Básicas</TabsTrigger>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="access">Controle de Acesso</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resource-title">Título *</Label>
                  <Input
                    id="resource-title"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    placeholder="Ex: Vídeo Aula 1"
                    className={!resourceTitle.trim() && isResourceDialogOpen ? "border-destructive" : ""}
                  />
                  {!resourceTitle.trim() && isResourceDialogOpen && (
                    <p className="text-xs text-destructive mt-1">Título é obrigatório</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="resource-type">Tipo de Recurso *</Label>
                  <Select value={resourceType} onValueChange={(value) => setResourceType(value as Resource['resource_type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Vídeo (YouTube, Vimeo, MP4)
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          PDF (Documento)
                        </div>
                      </SelectItem>
                      <SelectItem value="link">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Link Externo
                        </div>
                      </SelectItem>
                      <SelectItem value="unlock_link">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4" />
                          Link de Desbloqueio
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="resource-description">Descrição</Label>
                <Textarea
                  id="resource-description"
                  value={resourceDescription}
                  onChange={(e) => setResourceDescription(e.target.value)}
                  placeholder="Descrição opcional do recurso"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="resource-url">URL do Recurso *</Label>
                <Input
                  id="resource-url"
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder={
                    resourceType === 'video' ? "https://youtube.com/watch?v=... ou https://vimeo.com/..." :
                    resourceType === 'pdf' ? "https://exemplo.com/arquivo.pdf" :
                    "https://cdn.site.com/recurso"
                  }
                  className={(!resourceUrl.trim() || !urlValidation.isValid) && isResourceDialogOpen ? "border-destructive" : urlValidation.isValid && resourceUrl.trim() ? "border-green-500" : ""}
                />
                {urlValidation.message && (
                  <p className={`text-xs mt-1 ${urlValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                    {urlValidation.message}
                  </p>
                )}
                {!resourceUrl.trim() && isResourceDialogOpen && (
                  <p className="text-xs text-destructive mt-1">URL é obrigatória</p>
                )}
              </div>

              <div>
                <Label htmlFor="thumbnail-url">URL da Thumbnail (opcional)</Label>
                <Input
                  id="thumbnail-url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://cdn.site.com/thumbnail.jpg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Será usado como imagem de capa do recurso
                </p>
              </div>

              {thumbnailUrl && (
                <div>
                  <Label>Preview da Thumbnail</Label>
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    className="w-32 h-20 object-cover rounded border border-border mt-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="required-plan">Plano Necessário</Label>
                  <Select value={requiredPlan} onValueChange={setRequiredPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plano mínimo necessário para acessar este recurso
                  </p>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="is-resource-premium"
                    className="h-4 w-4 rounded border-border"
                    checked={isResourcePremium}
                    onChange={(e) => setIsResourcePremium(e.target.checked)}
                  />
                  <Label htmlFor="is-resource-premium">Conteúdo Premium</Label>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Configuração de Acesso</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>Gratuito:</strong> Todos os usuários podem acessar</p>
                  <p>• <strong>VIP:</strong> Apenas usuários VIP e Pro podem acessar</p>
                  <p>• <strong>Pro:</strong> Apenas usuários Pro podem acessar</p>
                  <p>• <strong>Premium:</strong> Destaque especial como conteúdo premium</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={selectedResource ? updateResource : createResource} 
              className="flex-1 bg-futuristic-gradient hover:opacity-90"
              disabled={!resourceTitle.trim() || !resourceUrl.trim() || !urlValidation.isValid}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {selectedResource ? 'Atualizar' : 'Criar'} Recurso
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsResourceDialogOpen(false);
                clearResourceForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
