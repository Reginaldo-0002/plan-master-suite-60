
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Save, 
  Upload, 
  Video, 
  FileText, 
  ExternalLink, 
  Image as ImageIcon,
  Trash2,
  Edit3,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MediaUpload } from "@/components/media/MediaUpload";

interface TopicResource {
  id?: string;
  title: string;
  description: string;
  resource_type: 'video' | 'pdf' | 'external_link' | 'image';
  resource_url: string;
  thumbnail_url?: string;
  is_premium: boolean;
  required_plan: 'free' | 'vip' | 'pro';
  resource_order: number;
}

interface AdvancedTopicEditorProps {
  topicId?: string;
  contentId: string;
  onSave?: (topicData: any) => void;
}

export const AdvancedTopicEditor = ({ topicId, contentId, onSave }: AdvancedTopicEditorProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicImageUrl, setTopicImageUrl] = useState("");
  const [resources, setResources] = useState<TopicResource[]>([]);
  const [newResource, setNewResource] = useState<Partial<TopicResource>>({
    resource_type: 'video',
    is_premium: false,
    required_plan: 'free',
    resource_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (topicId) {
      fetchTopicData();
    }
  }, [topicId]);

  const fetchTopicData = async () => {
    if (!topicId) return;

    try {
      const { data: topicData, error: topicError } = await supabase
        .from('content_topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;

      setTitle(topicData.title || "");
      setDescription(topicData.description || "");
      setTopicImageUrl(topicData.topic_image_url || "");

      // Fetch topic resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('topic_resources')
        .select('*')
        .eq('topic_id', topicId)
        .order('resource_order');

      if (resourcesError) throw resourcesError;
      setResources(resourcesData || []);

    } catch (error) {
      console.error('Error fetching topic data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do tópico",
        variant: "destructive",
      });
    }
  };

  const addResource = () => {
    if (!newResource.title || !newResource.resource_url) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const resource: TopicResource = {
      title: newResource.title!,
      description: newResource.description || "",
      resource_type: newResource.resource_type!,
      resource_url: newResource.resource_url!,
      thumbnail_url: newResource.thumbnail_url || "",
      is_premium: newResource.is_premium!,
      required_plan: newResource.required_plan!,
      resource_order: resources.length
    };

    setResources([...resources, resource]);
    setNewResource({
      resource_type: 'video',
      is_premium: false,
      required_plan: 'free',
      resource_order: 0
    });
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const reorderResource = (index: number, direction: 'up' | 'down') => {
    const newResources = [...resources];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newResources.length) {
      [newResources[index], newResources[targetIndex]] = [newResources[targetIndex], newResources[index]];
      setResources(newResources);
    }
  };

  const saveTopic = async () => {
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "O tópico deve ter um título",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let savedTopicId = topicId;

      // Save or update topic
      if (topicId) {
        const { error } = await supabase
          .from('content_topics')
          .update({
            title,
            description,
            topic_image_url: topicImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', topicId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('content_topics')
          .insert([{
            content_id: contentId,
            title,
            description,
            topic_image_url: topicImageUrl,
            topic_order: 0
          }])
          .select()
          .single();

        if (error) throw error;
        savedTopicId = data.id;
      }

      // Delete existing resources and recreate them
      if (savedTopicId) {
        await supabase
          .from('topic_resources')
          .delete()
          .eq('topic_id', savedTopicId);

        // Insert new resources
        if (resources.length > 0) {
          const resourcesToInsert = resources.map((resource, index) => ({
            topic_id: savedTopicId,
            title: resource.title,
            description: resource.description,
            resource_type: resource.resource_type,
            resource_url: resource.resource_url,
            thumbnail_url: resource.thumbnail_url || null,
            is_premium: resource.is_premium,
            required_plan: resource.required_plan,
            resource_order: index
          }));

          const { error: resourcesError } = await supabase
            .from('topic_resources')
            .insert(resourcesToInsert);

          if (resourcesError) throw resourcesError;
        }
      }

      toast({
        title: "Tópico salvo",
        description: "Tópico e recursos salvos com sucesso",
      });

      if (onSave) {
        onSave({ id: savedTopicId, title, description, resources });
      }

    } catch (error: any) {
      console.error('Error saving topic:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o tópico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'external_link': return <ExternalLink className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
        <CardHeader>
          <CardTitle className="text-futuristic-primary">
            {topicId ? 'Editar Tópico' : 'Novo Tópico'}
          </CardTitle>
          <CardDescription>
            Configure o tópico e adicione recursos como vídeos, PDFs e links externos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Tópico</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título do tópico"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topicImage">Imagem do Tópico (1920x1080)</Label>
              <div className="flex gap-2">
                <Input
                  id="topicImage"
                  value={topicImageUrl}
                  onChange={(e) => setTopicImageUrl(e.target.value)}
                  placeholder="URL da imagem ou use upload"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowMediaUpload(!showMediaUpload)}
                  className="border-futuristic-primary text-futuristic-primary"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do tópico"
              rows={3}
            />
          </div>

          {showMediaUpload && (
            <MediaUpload
              onUploadComplete={(url) => {
                setTopicImageUrl(url);
                setShowMediaUpload(false);
              }}
              targetWidth={1920}
              targetHeight={1080}
            />
          )}

          {topicImageUrl && (
            <div className="relative">
              <img 
                src={topicImageUrl} 
                alt="Preview do tópico" 
                className="w-full h-48 object-cover rounded-lg border border-futuristic-primary/20"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-background/60 backdrop-blur-sm border-futuristic-accent/20">
        <CardHeader>
          <CardTitle className="text-futuristic-accent">Recursos do Tópico</CardTitle>
          <CardDescription>
            Adicione vídeos, PDFs, links externos e outros recursos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Adicionar Recurso</TabsTrigger>
              <TabsTrigger value="list">Lista de Recursos ({resources.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Recurso</Label>
                  <select
                    value={newResource.resource_type}
                    onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value as any })}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="video">Vídeo</option>
                    <option value="pdf">PDF</option>
                    <option value="external_link">Link Externo</option>
                    <option value="image">Imagem</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Plano Necessário</Label>
                  <select
                    value={newResource.required_plan}
                    onChange={(e) => setNewResource({ ...newResource, required_plan: e.target.value as any })}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="free">Gratuito</option>
                    <option value="vip">VIP</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título do Recurso</Label>
                  <Input
                    value={newResource.title || ""}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Digite o título do recurso"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do Recurso</Label>
                  <Input
                    value={newResource.resource_url || ""}
                    onChange={(e) => setNewResource({ ...newResource, resource_url: e.target.value })}
                    placeholder="URL do vídeo, PDF ou link"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Recurso</Label>
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
                  <span className="text-sm">Conteúdo Premium</span>
                </label>
              </div>

              <Button onClick={addResource} className="w-full bg-futuristic-gradient hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Recurso
              </Button>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              {resources.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum recurso adicionado ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map((resource, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 border border-futuristic-primary/20 rounded-lg bg-background/20">
                      <div className="text-futuristic-primary">
                        {getResourceIcon(resource.resource_type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{resource.title}</h4>
                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {resource.resource_type}
                          </Badge>
                          <Badge className={getPlanBadgeColor(resource.required_plan)}>
                            {resource.required_plan.toUpperCase()}
                          </Badge>
                          {resource.is_premium && (
                            <Badge className="bg-futuristic-neon text-white">Premium</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reorderResource(index, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reorderResource(index, 'down')}
                          disabled={index === resources.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeResource(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button 
            onClick={saveTopic} 
            disabled={loading}
            className="w-full bg-futuristic-gradient hover:opacity-90"
          >
            {loading ? "Salvando..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Tópico
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
