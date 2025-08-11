
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Save, Edit, Trash2, Video, FileText, ExternalLink, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  topic_image_url: string | null;
  topic_order: number;
}

interface Resource {
  id?: string;
  title: string;
  description: string;
  resource_type: 'video' | 'pdf' | 'link' | 'unlock_link';
  resource_url: string;
  thumbnail_url?: string;
  is_premium: boolean;
  required_plan: 'free' | 'vip' | 'pro';
  resource_order: number;
}

interface ContentTopicsEditorProps {
  contentId: string;
  onSave?: () => void;
}

export const ContentTopicsEditor = ({ contentId, onSave }: ContentTopicsEditorProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", description: "", topic_image_url: "" });
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    title: "",
    description: "",
    resource_type: 'video',
    resource_url: "",
    is_premium: false,
    required_plan: 'free',
    resource_order: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTopics();
  }, [contentId]);

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
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tópicos",
        variant: "destructive",
      });
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

  const saveTopic = async () => {
    if (!newTopic.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditingTopic && selectedTopic) {
        const { error } = await supabase
          .from('content_topics')
          .update({
            title: newTopic.title,
            description: newTopic.description,
            topic_image_url: newTopic.topic_image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTopic.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_topics')
          .insert([{
            content_id: contentId,
            title: newTopic.title,
            description: newTopic.description,
            topic_image_url: newTopic.topic_image_url,
            topic_order: topics.length
          }]);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Tópico salvo com sucesso",
      });

      setIsTopicDialogOpen(false);
      setIsEditingTopic(false);
      setNewTopic({ title: "", description: "", topic_image_url: "" });
      fetchTopics();
      onSave?.();
    } catch (error: any) {
      console.error('Error saving topic:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar tópico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addResource = async () => {
    if (!selectedTopic || !newResource.title || !newResource.resource_url) {
      toast({
        title: "Erro",
        description: "Título e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('topic_resources')
        .insert([{
          topic_id: selectedTopic.id,
          title: newResource.title,
          description: newResource.description,
          resource_type: newResource.resource_type,
          resource_url: newResource.resource_url,
          thumbnail_url: newResource.thumbnail_url,
          is_premium: newResource.is_premium,
          required_plan: newResource.required_plan,
          resource_order: resources.length
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recurso adicionado com sucesso",
      });

      setNewResource({
        title: "",
        description: "",
        resource_type: 'video',
        resource_url: "",
        is_premium: false,
        required_plan: 'free',
        resource_order: 0
      });

      fetchResources(selectedTopic.id);
    } catch (error: any) {
      console.error('Error adding resource:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar recurso",
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

  const openTopicForEdit = (topic: Topic) => {
    setSelectedTopic(topic);
    setNewTopic({
      title: topic.title,
      description: topic.description || "",
      topic_image_url: topic.topic_image_url || ""
    });
    setIsEditingTopic(true);
    setIsTopicDialogOpen(true);
  };

  const openTopicResources = (topic: Topic) => {
    setSelectedTopic(topic);
    fetchResources(topic.id);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'link': 
      case 'unlock_link': return <ExternalLink className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tópicos do Conteúdo</h3>
        <Button onClick={() => setIsTopicDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tópico
        </Button>
      </div>

      {/* Topics List */}
      <div className="grid gap-4 md:grid-cols-2">
        {topics.map((topic) => (
          <Card key={topic.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{topic.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTopicForEdit(topic)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTopicResources(topic)}
                  >
                    Recursos
                  </Button>
                </div>
              </div>
              {topic.description && (
                <CardDescription>{topic.description}</CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Topic Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditingTopic ? 'Editar Tópico' : 'Novo Tópico'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic-title">Título</Label>
              <Input
                id="topic-title"
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                placeholder="Título do tópico"
              />
            </div>
            <div>
              <Label htmlFor="topic-description">Descrição</Label>
              <Textarea
                id="topic-description"
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="Descrição do tópico"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="topic-image">URL da Imagem</Label>
              <Input
                id="topic-image"
                value={newTopic.topic_image_url}
                onChange={(e) => setNewTopic({ ...newTopic, topic_image_url: e.target.value })}
                placeholder="URL da imagem do tópico"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveTopic} disabled={loading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resources Panel */}
      {selectedTopic && (
        <Card>
          <CardHeader>
            <CardTitle>Recursos - {selectedTopic.title}</CardTitle>
            <CardDescription>
              Gerencie vídeos, PDFs e links do tópico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Resource Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <Label>Tipo de Recurso</Label>
                <select
                  value={newResource.resource_type}
                  onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="video">Vídeo</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                  <option value="unlock_link">Link de Desbloqueio</option>
                </select>
              </div>
              <div>
                <Label>Plano Necessário</Label>
                <select
                  value={newResource.required_plan}
                  onChange={(e) => setNewResource({ ...newResource, required_plan: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="free">Gratuito</option>
                  <option value="vip">VIP</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={newResource.title || ""}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Título do recurso"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={newResource.resource_url || ""}
                  onChange={(e) => setNewResource({ ...newResource, resource_url: e.target.value })}
                  placeholder="URL do recurso"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={newResource.description || ""}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Descrição do recurso"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newResource.is_premium || false}
                    onChange={(e) => setNewResource({ ...newResource, is_premium: e.target.checked })}
                  />
                  <span>Premium</span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={addResource}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Resources List */}
            <div className="space-y-3">
              {resources.map((resource) => (
                <div key={resource.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="text-primary">
                    {getResourceIcon(resource.resource_type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{resource.title}</h4>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {resource.resource_type}
                      </Badge>
                      <Badge className={getPlanBadgeColor(resource.required_plan)}>
                        {resource.required_plan.toUpperCase()}
                      </Badge>
                      {resource.is_premium && (
                        <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteResource(resource.id!)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {resources.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhum recurso adicionado ainda
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
