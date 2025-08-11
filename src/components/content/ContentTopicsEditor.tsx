
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Upload, ExternalLink, Video, FileText } from "lucide-react";
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
  const [resourceType, setResourceType] = useState<Resource['resource_type']>("link");
  const [resourceUrl, setResourceUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isResourcePremium, setIsResourcePremium] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState("free");
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTopics();
  }, [contentId]);

  useEffect(() => {
    if (activeTopic) {
      fetchResources(activeTopic);
    }
  }, [activeTopic]);

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
      setResources(data || []);
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
    if (!topicTitle) {
      toast({
        title: "Erro",
        description: "Título do tópico é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('content_topics')
        .insert([{
          title: topicTitle,
          description: topicDescription,
          content_id: contentId,
          topic_image_url: topicImageUrl,
          topic_order: topics.length,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico criado com sucesso",
      });

      setIsTopicDialogOpen(false);
      clearTopicForm();
      fetchTopics();
      onSave();
    } catch (error: any) {
      console.error('Error creating topic:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar tópico",
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
    if (!resourceTitle || !resourceUrl || !activeTopic) {
      toast({
        title: "Erro",
        description: "Título, URL e tópico são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('topic_resources')
        .insert([{
          title: resourceTitle,
          description: resourceDescription,
          resource_type: resourceType,
          resource_url: resourceUrl,
          thumbnail_url: thumbnailUrl,
          is_premium: isResourcePremium,
          required_plan: requiredPlan,
          topic_id: activeTopic,
          resource_order: resources.length,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso criado com sucesso",
      });

      setIsResourceDialogOpen(false);
      clearResourceForm();
      fetchResources(activeTopic);
      onSave();
    } catch (error: any) {
      console.error('Error creating resource:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar recurso",
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
    if (!confirm("Tem certeza que deseja excluir este tópico?")) return;

    try {
      const { error } = await supabase
        .from('content_topics')
        .update({ is_active: false })
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico excluído com sucesso",
      });

      fetchTopics();
      onSave();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir tópico",
        variant: "destructive",
      });
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm("Tem certeza que deseja excluir este recurso?")) return;

    try {
      const { error } = await supabase
        .from('topic_resources')
        .update({ is_active: false })
        .eq('id', resourceId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso excluído com sucesso",
      });

      fetchResources(activeTopic!);
      onSave();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir recurso",
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
    setResourceType("link");
    setResourceUrl("");
    setThumbnailUrl("");
    setIsResourcePremium(false);
    setRequiredPlan("free");
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'unlock_link':
      case 'link': 
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    const colors = {
      video: 'bg-red-100 text-red-800',
      pdf: 'bg-blue-100 text-blue-800',
      link: 'bg-green-100 text-green-800',
      unlock_link: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || colors.link;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Gestão de Tópicos</h3>
        <Button onClick={() => setIsTopicDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tópico
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics Sidebar */}
        <div className="space-y-4">
          <h4 className="font-semibold">Tópicos</h4>
          {topics.map((topic) => (
            <Card 
              key={topic.id} 
              className={`cursor-pointer transition-colors ${
                activeTopic === topic.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTopic(topic.id)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{topic.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTopicEditDialog(topic);
                      }}
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
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Resources Content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              Recursos {activeTopic && topics.find(t => t.id === activeTopic)?.title && 
                `- ${topics.find(t => t.id === activeTopic)?.title}`}
            </h4>
            <Button 
              onClick={() => setIsResourceDialogOpen(true)}
              disabled={!activeTopic}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Recurso
            </Button>
          </div>

          {activeTopic ? (
            <div className="grid gap-4 md:grid-cols-2">
              {resources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getResourceIcon(resource.resource_type)}
                        <CardTitle className="text-sm">{resource.title}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openResourceEditDialog(resource)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteResource(resource.id)}
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
                        {resource.resource_type}
                      </Badge>
                      {resource.is_premium && (
                        <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                      )}
                      <Badge variant="outline">{resource.required_plan}</Badge>
                    </div>
                    {resource.thumbnail_url && (
                      <img
                        src={resource.thumbnail_url}
                        alt={resource.title}
                        className="w-full h-20 object-cover rounded mt-3"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Selecione um tópico para ver seus recursos
            </div>
          )}
        </div>
      </div>

      {/* Topic Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTopic ? 'Editar Tópico' : 'Novo Tópico'}
            </DialogTitle>
            <DialogDescription>
              {selectedTopic ? 'Altere os detalhes do tópico' : 'Adicione um novo tópico ao conteúdo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic-title">Título</Label>
              <Input
                id="topic-title"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Título do tópico"
              />
            </div>
            <div>
              <Label htmlFor="topic-description">Descrição</Label>
              <Textarea
                id="topic-description"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                placeholder="Descrição do tópico"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="topic-image">URL da Imagem</Label>
              <Input
                id="topic-image"
                value={topicImageUrl}
                onChange={(e) => setTopicImageUrl(e.target.value)}
                placeholder="URL da imagem do tópico"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={selectedTopic ? updateTopic : createTopic} 
                className="flex-1"
              >
                {selectedTopic ? 'Atualizar' : 'Criar'}
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

      {/* Resource Dialog */}
      <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedResource ? 'Editar Recurso' : 'Novo Recurso'}
            </DialogTitle>
            <DialogDescription>
              {selectedResource ? 'Altere os detalhes do recurso' : 'Adicione um novo recurso ao tópico'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resource-title">Título</Label>
                <Input
                  id="resource-title"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="Título do recurso"
                />
              </div>
              <div>
                <Label htmlFor="resource-type">Tipo</Label>
                <Select value={resourceType} onValueChange={(value) => setResourceType(value as Resource['resource_type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="unlock_link">Link de Desbloqueio</SelectItem>
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
                placeholder="Descrição do recurso"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resource-url">URL do Recurso</Label>
                <Input
                  id="resource-url"
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder="URL do recurso"
                />
              </div>
              <div>
                <Label htmlFor="thumbnail-url">URL da Thumbnail</Label>
                <Input
                  id="thumbnail-url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="URL da thumbnail"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="required-plan">Plano Necessário</Label>
                <Select value={requiredPlan} onValueChange={setRequiredPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is-resource-premium"
                  className="h-4 w-4"
                  checked={isResourcePremium}
                  onChange={(e) => setIsResourcePremium(e.target.checked)}
                />
                <Label htmlFor="is-resource-premium">Premium</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={selectedResource ? updateResource : createResource} 
                className="flex-1"
              >
                {selectedResource ? 'Atualizar' : 'Criar'}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
