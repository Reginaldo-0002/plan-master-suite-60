import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  video_url: string | null;
  content_url?: string | null;
  hero_image_url: string | null;
  hero_image_alt?: string | null;
  image_url?: string | null;
  carousel_image_url: string | null;
  is_active: boolean;
  is_premium?: boolean;
  required_plan: 'free' | 'vip' | 'pro';
  status: string | null;
  published_at: string | null;
  auto_publish_at: string | null;
  show_in_carousel: boolean;
  carousel_order: number;
  order_index: number;
  difficulty_level: string | null;
  estimated_duration: number | null;
  tags: string[] | null;
  metadata: any;
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
  const [videoUrl, setVideoUrl] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [carouselImageUrl, setCarouselImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState<Content['required_plan']>("free");
  const [showInCarousel, setShowInCarousel] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState("beginner");
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
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
        .select(`
          id,
          title,
          description,
          content_type,
          video_url,
          hero_image_url,
          carousel_image_url,
          is_active,
          required_plan,
          status,
          published_at,
          auto_publish_at,
          show_in_carousel,
          carousel_order,
          order_index,
          difficulty_level,
          estimated_duration,
          tags,
          metadata,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match our interface, adding optional fields
      const transformedData = (data || []).map(item => ({
        ...item,
        content_url: null,
        hero_image_alt: null,
        image_url: null,
        is_premium: false
      }));
      
      setContent(transformedData);
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
      const insertData: any = {
        title,
        description,
        content_type: contentType,
        video_url: videoUrl || null,
        hero_image_url: heroImageUrl || null,
        carousel_image_url: carouselImageUrl || null,
        is_active: isActive,
        required_plan: requiredPlan,
        show_in_carousel: showInCarousel,
        difficulty_level: difficultyLevel,
        estimated_duration: estimatedDuration,
        status: 'draft'
      };

      // Only add optional fields if they exist
      if (contentUrl) insertData.content_url = contentUrl;
      if (heroImageAlt) insertData.hero_image_alt = heroImageAlt;
      if (imageUrl) insertData.image_url = imageUrl;
      if (isPremium !== undefined) insertData.is_premium = isPremium;

      const { error } = await supabase
        .from('content')
        .insert([insertData]);

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
      const updateData: any = {
        title,
        description,
        content_type: contentType,
        video_url: videoUrl || null,
        hero_image_url: heroImageUrl || null,
        carousel_image_url: carouselImageUrl || null,
        is_active: isActive,
        required_plan: requiredPlan,
        show_in_carousel: showInCarousel,
        difficulty_level: difficultyLevel,
        estimated_duration: estimatedDuration,
        updated_at: new Date().toISOString()
      };

      // Only add optional fields if they exist
      if (contentUrl) updateData.content_url = contentUrl;
      if (heroImageAlt) updateData.hero_image_alt = heroImageAlt;
      if (imageUrl) updateData.image_url = imageUrl;
      if (isPremium !== undefined) updateData.is_premium = isPremium;

      const { error } = await supabase
        .from('content')
        .update(updateData)
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
      const insertData: any = {
        title: `${content.title} (Cópia)`,
        description: content.description,
        content_type: content.content_type,
        video_url: content.video_url,
        hero_image_url: content.hero_image_url,
        carousel_image_url: content.carousel_image_url,
        is_active: content.is_active,
        required_plan: content.required_plan,
        show_in_carousel: content.show_in_carousel,
        difficulty_level: content.difficulty_level,
        estimated_duration: content.estimated_duration,
        status: 'draft'
      };

      if (content.content_url) insertData.content_url = content.content_url;
      if (content.hero_image_alt) insertData.hero_image_alt = content.hero_image_alt;
      if (content.image_url) insertData.image_url = content.image_url;
      if (content.is_premium !== undefined) insertData.is_premium = content.is_premium;

      const { error } = await supabase
        .from('content')
        .insert([insertData]);

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
    setVideoUrl(content.video_url || "");
    setContentUrl(content.content_url || "");
    setHeroImageUrl(content.hero_image_url || "");
    setHeroImageAlt(content.hero_image_alt || "");
    setImageUrl(content.image_url || "");
    setCarouselImageUrl(content.carousel_image_url || "");
    setIsActive(content.is_active);
    setIsPremium(content.is_premium || false);
    setRequiredPlan(content.required_plan);
    setShowInCarousel(content.show_in_carousel);
    setDifficultyLevel(content.difficulty_level || "beginner");
    setEstimatedDuration(content.estimated_duration);
    setIsEditDialogOpen(true);
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setContentType("product");
    setVideoUrl("");
    setContentUrl("");
    setHeroImageUrl("");
    setHeroImageAlt("");
    setImageUrl("");
    setCarouselImageUrl("");
    setIsActive(true);
    setIsPremium(false);
    setRequiredPlan("free");
    setShowInCarousel(false);
    setDifficultyLevel("beginner");
    setEstimatedDuration(null);
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

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

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
                      src={content.hero_image_url || content.image_url || content.carousel_image_url || '/placeholder.svg'}
                      alt={content.hero_image_alt || content.title}
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
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary">{content.content_type}</Badge>
                      {content.is_premium && (
                        <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                      )}
                      {content.status && (
                        <Badge variant="outline">{content.status}</Badge>
                      )}
                      {content.show_in_carousel && (
                        <Badge className="bg-green-100 text-green-800">Carousel</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <div className="flex gap-2 flex-wrap">
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Conteúdo</DialogTitle>
                <DialogDescription>
                  Altere os detalhes do conteúdo selecionado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="video-url">URL do Vídeo</Label>
                    <Input
                      id="video-url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="URL do vídeo"
                    />
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
                </div>

                <div>
                  <Label htmlFor="hero-image-url">URL da Imagem Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hero-image-url"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="URL da imagem principal"
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
                        setHeroImageUrl(url);
                        setShowMediaUpload(false);
                      }}
                      targetWidth={1920}
                      targetHeight={1080}
                    />
                  )}
                  {heroImageUrl && (
                    <img
                      src={heroImageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hero-image-alt">Texto Alternativo da Imagem</Label>
                    <Input
                      id="hero-image-alt"
                      value={heroImageAlt}
                      onChange={(e) => setHeroImageAlt(e.target.value)}
                      placeholder="Descrição da imagem para acessibilidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image-url">URL da Imagem Alternativa</Label>
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="URL da imagem alternativa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty-level">Nível de Dificuldade</Label>
                    <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimated-duration">Duração Estimada (minutos)</Label>
                    <Input
                      id="estimated-duration"
                      type="number"
                      value={estimatedDuration || ""}
                      onChange={(e) => setEstimatedDuration(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Duração em minutos"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show-in-carousel"
                        className="h-4 w-4"
                        checked={showInCarousel}
                        onChange={(e) => setShowInCarousel(e.target.checked)}
                      />
                      <Label htmlFor="show-in-carousel">Mostrar no Carousel</Label>
                    </div>
                  </div>
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Conteúdo</DialogTitle>
                <DialogDescription>
                  Adicione um novo produto, ferramenta, curso ou tutorial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="video-url">URL do Vídeo</Label>
                    <Input
                      id="video-url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="URL do vídeo"
                    />
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
                </div>

                <div>
                  <Label htmlFor="hero-image-url">URL da Imagem Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hero-image-url"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="URL da imagem principal"
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
                        setHeroImageUrl(url);
                        setShowMediaUpload(false);
                      }}
                      targetWidth={1920}
                      targetHeight={1080}
                    />
                  )}
                  {heroImageUrl && (
                    <img
                      src={heroImageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hero-image-alt">Texto Alternativo da Imagem</Label>
                    <Input
                      id="hero-image-alt"
                      value={heroImageAlt}
                      onChange={(e) => setHeroImageAlt(e.target.value)}
                      placeholder="Descrição da imagem para acessibilidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image-url">URL da Imagem Alternativa</Label>
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="URL da imagem alternativa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty-level">Nível de Dificuldade</Label>
                    <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimated-duration">Duração Estimada (minutos)</Label>
                    <Input
                      id="estimated-duration"
                      type="number"
                      value={estimatedDuration || ""}
                      onChange={(e) => setEstimatedDuration(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Duração em minutos"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show-in-carousel"
                        className="h-4 w-4"
                        checked={showInCarousel}
                        onChange={(e) => setShowInCarousel(e.target.checked)}
                      />
                      <Label htmlFor="show-in-carousel">Mostrar no Carousel</Label>
                    </div>
                  </div>
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
