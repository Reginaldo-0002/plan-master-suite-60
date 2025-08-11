import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCheck, Copy, Edit, MessageSquare, Plus, Search, Trash2, Upload, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MediaUpload } from "@/components/media/MediaUpload";
import { ContentTopicsEditor } from "@/components/content/ContentTopicsEditor";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  content_url: string | null;
  image_url: string | null;
  is_active: boolean;
  is_premium: boolean;
  required_plan: 'free' | 'vip' | 'pro';
  created_at: string;
  updated_at: string;
}

export const AdminContentManagement = () => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<Content['content_type']>("product");
  const [contentUrl, setContentUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState<Content['required_plan']>("free");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showTopicsEditor, setShowTopicsEditor] = useState(false);
  const [selectedContentForTopics, setSelectedContentForTopics] = useState<Content | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conteúdo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContent = async () => {
    if (!title || !contentType) {
      toast({
        title: "Erro",
        description: "Título e tipo de conteúdo são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('content')
        .insert([{
          title,
          description,
          content_type: contentType,
          content_url: contentUrl,
          image_url: imageUrl,
          is_active: isActive,
          is_premium: isPremium,
          required_plan: requiredPlan
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo criado com sucesso",
      });

      setIsNewDialogOpen(false);
      clearForm();
      fetchContent();
    } catch (error: any) {
      console.error('Error creating content:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conteúdo",
        variant: "destructive",
      });
    }
  };

  const updateContent = async () => {
    if (!selectedContent) return;

    try {
      const { error } = await supabase
        .from('content')
        .update({
          title,
          description,
          content_type: contentType,
          content_url: contentUrl,
          image_url: imageUrl,
          is_active: isActive,
          is_premium: isPremium,
          required_plan: requiredPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedContent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo atualizado com sucesso",
      });

      setIsEditDialogOpen(false);
      clearForm();
      fetchContent();
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar conteúdo",
        variant: "destructive",
      });
    }
  };

  const deleteContent = async (contentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este conteúdo?")) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo excluído com sucesso",
      });

      fetchContent();
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir conteúdo",
        variant: "destructive",
      });
    }
  };

  const duplicateContent = async (content: Content) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .insert([{
          title: `${content.title} (Cópia)`,
          description: content.description,
          content_type: content.content_type,
          content_url: content.content_url,
          image_url: content.image_url,
          is_active: content.is_active,
          is_premium: content.is_premium,
          required_plan: content.required_plan
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo duplicado com sucesso",
      });

      fetchContent();
    } catch (error: any) {
      console.error('Error duplicating content:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao duplicar conteúdo",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (content: Content) => {
    setSelectedContent(content);
    setTitle(content.title);
    setDescription(content.description || "");
    setContentType(content.content_type);
    setContentUrl(content.content_url || "");
    setImageUrl(content.image_url || "");
    setIsActive(content.is_active);
    setIsPremium(content.is_premium);
    setRequiredPlan(content.required_plan);
    setIsEditDialogOpen(true);
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setContentType("product");
    setContentUrl("");
    setImageUrl("");
    setIsActive(true);
    setIsPremium(false);
    setRequiredPlan("free");
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContent = content.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openTopicsEditor = (content: Content) => {
    setSelectedContentForTopics(content);
    setShowTopicsEditor(true);
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Conteúdo</h2>
          <p className="text-muted-foreground">
            Gerencie todos os produtos, ferramentas, cursos e tutoriais
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      <Input
        placeholder="Buscar por título ou tipo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {showTopicsEditor ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowTopicsEditor(false)}>
              ← Voltar para Conteúdos
            </Button>
            <h3 className="text-xl font-semibold">
              Tópicos - {selectedContentForTopics?.title}
            </h3>
          </div>
          <ContentTopicsEditor 
            contentId={selectedContentForTopics!.id}
            onSave={() => fetchContent()}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredContent.map((content) => (
              <Card key={content.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-foreground">{content.title}</CardTitle>
                  <Badge className={getPlanBadgeColor(content.required_plan)}>
                    {content.required_plan.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={content.image_url || '/placeholder.svg'}
                      alt={content.title}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: '16/9' }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
                    {content.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {content.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary">{content.content_type}</Badge>
                      {content.is_premium && (
                        <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(content)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateContent(content)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteContent(content.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTopicsEditor(content)}
                    >
                      Tópicos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Conteúdo</DialogTitle>
                <DialogDescription>
                  Altere os detalhes do conteúdo selecionado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do conteúdo"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição do conteúdo"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="content-type">Tipo de Conteúdo</Label>
                  <Select value={contentType} onValueChange={(value) => setContentType(value as Content['content_type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produto</SelectItem>
                      <SelectItem value="tool">Ferramenta</SelectItem>
                      <SelectItem value="course">Curso</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="content-url">URL do Conteúdo</Label>
                  <Input
                    id="content-url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="URL do conteúdo"
                  />
                </div>
                <div>
                  <Label htmlFor="image-url">URL da Imagem (1920x1080)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="URL da imagem"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setShowMediaUpload(!showMediaUpload)}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  {showMediaUpload && (
                    <MediaUpload
                      onUploadComplete={(url) => {
                        setImageUrl(url);
                        setShowMediaUpload(false);
                      }}
                      targetWidth={1920}
                      targetHeight={1080}
                    />
                  )}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-active"
                    className="h-4 w-4"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <Label htmlFor="is-active">Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-premium"
                    className="h-4 w-4"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                  />
                  <Label htmlFor="is-premium">Premium</Label>
                </div>
                <div>
                  <Label htmlFor="required-plan">Plano Necessário</Label>
                  <Select value={requiredPlan} onValueChange={(value) => setRequiredPlan(value as Content['required_plan'])}>
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
                  <Button onClick={updateContent} className="flex-1">
                    Atualizar
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Conteúdo</DialogTitle>
                <DialogDescription>
                  Adicione um novo produto, ferramenta, curso ou tutorial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do conteúdo"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição do conteúdo"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="content-type">Tipo de Conteúdo</Label>
                  <Select value={contentType} onValueChange={(value) => setContentType(value as Content['content_type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produto</SelectItem>
                      <SelectItem value="tool">Ferramenta</SelectItem>
                      <SelectItem value="course">Curso</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="content-url">URL do Conteúdo</Label>
                  <Input
                    id="content-url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="URL do conteúdo"
                  />
                </div>
                <div>
                  <Label htmlFor="image-url">URL da Imagem (1920x1080)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="URL da imagem"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setShowMediaUpload(!showMediaUpload)}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  {showMediaUpload && (
                    <MediaUpload
                      onUploadComplete={(url) => {
                        setImageUrl(url);
                        setShowMediaUpload(false);
                      }}
                      targetWidth={1920}
                      targetHeight={1080}
                    />
                  )}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-active"
                    className="h-4 w-4"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <Label htmlFor="is-active">Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-premium"
                    className="h-4 w-4"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                  />
                  <Label htmlFor="is-premium">Premium</Label>
                </div>
                <div>
                  <Label htmlFor="required-plan">Plano Necessário</Label>
                  <Select value={requiredPlan} onValueChange={(value) => setRequiredPlan(value as Content['required_plan'])}>
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
                  <Button onClick={createContent} className="flex-1">
                    Criar
                  </Button>
                  <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
