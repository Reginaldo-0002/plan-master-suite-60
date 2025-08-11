
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Upload, ExternalLink, FileText, Video, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Topic {
  id: string;
  content_id: string;
  title: string;
  description: string | null;
  topic_order: number;
  topic_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Resource {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  resource_type: 'link' | 'video' | 'pdf' | 'unlock_link';
  resource_url: string;
  thumbnail_url: string | null;
  resource_order: number;
  is_active: boolean;
  is_premium: boolean;
  required_plan: string;
  created_at: string;
  updated_at: string;
}

interface ContentTopicsEditorProps {
  contentId: string;
  onSave?: () => void;
}

export const ContentTopicsEditor = ({ contentId, onSave }: ContentTopicsEditorProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
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
  const [resourceRequiredPlan, setResourceRequiredPlan] = useState("free");

  const { toast } = useToast();

  useEffect(() => {
    fetchTopics();
  }, [contentId]);

  useEffect(() => {
    if (selectedTopic) {
      fetchResources(selectedTopic.id);
    }
  }, [selectedTopic]);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('content_topics')
        .select('*')
        .eq('content_id', contentId)
        .order('topic_order', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
      
      if (data && data.length > 0 && !selectedTopic) {
        setSelectedTopic(data[0]);
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
        .order('resource_order', { ascending: true });

      if (error) throw error;
      
      // Ensure resource_type is properly typed
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
          content_id: contentId,
          title: topicTitle,
          description: topicDescription,
          topic_image_url: topicImageUrl,
          topic_order: topics.length + 1,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico criado com sucesso",
      });

      setShowTopicDialog(false);
      clearTopicForm();
      fetchTopics();
      onSave?.();
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
    if (!editingTopic) return;

    try {
      const { error } = await supabase
        .from('content_topics')
        .update({
          title: topicTitle,
          description: topicDescription,
          topic_image_url: topicImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTopic.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico atualizado com sucesso",
      });

      setShowTopicDialog(false);
      setEditingTopic(null);
      clearTopicForm();
      fetchTopics();
      onSave?.();
    } catch (error: any) {
      console.error('Error updating topic:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar tópico",
        variant: "destructive",
      });
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm("Tem certeza que deseja excluir este tópico?")) return;

    try {
      const { error } = await supabase
        .from('content_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tópico excluído com sucesso",
      });

      fetchTopics();
      onSave?.();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir tópico",
        variant: "destructive",
      });
    }
  };

  const createResource = async () => {
    if (!selectedTopic || !resourceTitle.trim() || !resourceUrl.trim()) {
      toast({
        title: "Erro",
        description: "Título e URL do recurso são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('topic_resources')
        .insert([{
          topic_id: selectedTopic.id,
          title: resourceTitle,
          description: resourceDescription,
          resource_type: resourceType,
          resource_url: resourceUrl,
          thumbnail_url: thumbnailUrl,
          resource_order: resources.length + 1,
          is_active: true,
          is_premium: isResourcePremium,
          required_plan: resourceRequiredPlan
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso criado com sucesso",
      });

      setShowResourceDialog(false);
      clearResourceForm();
      fetchResources(selectedTopic.id);
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
    if (!editingResource) return;

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
          required_plan: resourceRequiredPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingResource.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso atualizado com sucesso",
      });

      setShowResourceDialog(false);
      setEditingResource(null);
      clearResourceForm();
      if (selectedTopic) {
        fetchResources(selectedTopic.id);
      }
    } catch (error: any) {
      console.error('Error updating resource:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar recurso",
        variant: "destructive",
      });
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm("Tem certeza que deseja excluir este recurso?")) return;

    try {
      const { error } = await supabase
        .from('topic_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso excluído com sucesso",
      });

      if (selectedTopic) {
        fetchResources(selectedTopic.id);
      }
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir recurso",
        variant: "destructive",
      });
    }
  };

  const clearTopicForm = () => {
    setTopicTitle("");
    setTopicDescription("");
    setTopicImageUrl("");
  };

  const clearResourceForm = () => {
    setResourceTitle("");
    setResourceDescription("");
    setResourceType("link");
    setResourceUrl("");
    setThumbnailUrl("");
    setIsResourcePremium(false);
    setResourceRequiredPlan("free");
  };

  const openEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description || "");
    setTopicImageUrl(topic.topic_image_url || "");
    setShowTopicDialog(true);
  };

  const openEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setResourceTitle(resource.title);
    setResourceDescription(resource.description || "");
    setResourceType(resource.resource_type);
    setResourceUrl(resource.resource_url);
    setThumbnailUrl(resource.thumbnail_url || "");
    setIsResourcePremium(resource.is_premium);
    setResourceRequiredPlan(resource.required_plan);
    setShowResourceDialog(true);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'link':
      case 'unlock_link': return <Link className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Topics Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tópicos do Conteúdo</CardTitle>
              <CardDescription>
                Organize o conteúdo em tópicos estruturados
              </CardDescription>
            </div>
            <Button onClick={() => setShowTopicDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Tópico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Card key={topic.id} className={`cursor-pointer transition-colors ${
                selectedTopic?.id === topic.id ? 'ring-2 ring-primary' : 'hover:bg-muted'
              }`} onClick={() => setSelectedTopic(topic)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{topic.title}</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTopic(topic);
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                  <Badge variant="secondary" className="mt-2">
                    Ordem: {topic.topic_order}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources Section */}
      {selectedTopic && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recursos - {selectedTopic.title}</CardTitle>
                <CardDescription>
                  Adicione vídeos, links, PDFs e outros recursos
                </CardDescription>
              </div>
              <Button onClick={() => setShowResourceDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Recurso
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resources.map((resource) => (
                <Card key={resource.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getResourceIcon(resource.resource_type)}
                        <div>
                          <h4 className="font-semibold">{resource.title}</h4>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground">
                              {resource.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{resource.resource_type}</Badge>
                            {resource.is_premium && (
                              <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                            )}
                            <Badge variant="outline">{resource.required_plan}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditResource(resource)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteResource(resource.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(resource.resource_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topic Dialog */}
      <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? 'Editar Tópico' : 'Novo Tópico'}
            </DialogTitle>
            <DialogDescription>
              {editingTopic ? 'Edite os detalhes do tópico' : 'Adicione um novo tópico ao conteúdo'}
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
              <Button onClick={editingTopic ? updateTopic : createTopic} className="flex-1">
                {editingTopic ? 'Atualizar' : 'Criar'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowTopicDialog(false);
                setEditingTopic(null);
                clearTopicForm();
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resource Dialog */}
      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Editar Recurso' : 'Novo Recurso'}
            </DialogTitle>
            <DialogDescription>
              {editingResource ? 'Edite os detalhes do recurso' : 'Adicione um novo recurso ao tópico'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label htmlFor="resource-description">Descrição</Label>
              <Textarea
                id="resource-description"
                value={resourceDescription}
                onChange={(e) => setResourceDescription(e.target.value)}
                placeholder="Descrição do recurso"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="resource-type">Tipo de Recurso</Label>
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
                placeholder="URL da thumbnail (opcional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-resource-premium"
                className="h-4 w-4"
                checked={isResourcePremium}
                onChange={(e) => setIsResourcePremium(e.target.checked)}
              />
              <Label htmlFor="is-resource-premium">Premium</Label>
            </div>
            <div>
              <Label htmlFor="resource-required-plan">Plano Necessário</Label>
              <Select value={resourceRequiredPlan} onValueChange={setResourceRequiredPlan}>
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
            <div className="flex gap-2">
              <Button onClick={editingResource ? updateResource : createResource} className="flex-1">
                {editingResource ? 'Atualizar' : 'Criar'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowResourceDialog(false);
                setEditingResource(null);
                clearResourceForm();
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
