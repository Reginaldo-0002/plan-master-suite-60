import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Video, FileText, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  video_url: string | null;
  required_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  carousel_image_url: string | null;
  carousel_order: number | null;
  show_in_carousel: boolean | null;
}

interface FormData {
  title: string;
  description: string;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  video_url: string;
  required_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
  order_index: number;
  carousel_image_url: string;
  carousel_order: number;
  show_in_carousel: boolean;
}

export const AdminContentManagement = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    content_type: "product",
    video_url: "",
    required_plan: "free",
    is_active: true,
    order_index: 0,
    carousel_image_url: "",
    carousel_order: 0,
    show_in_carousel: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
    
    const channel = supabase
      .channel('content-management')
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

  const createContent = async () => {
    try {
      const { error } = await supabase
        .from('content')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo criado com sucesso",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      fetchContents();
    } catch (error) {
      console.error('Error creating content:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar conteúdo",
        variant: "destructive",
      });
    }
  };

  const updateContent = async () => {
    if (!editingContent) return;

    try {
      const { error } = await supabase
        .from('content')
        .update(formData)
        .eq('id', editingContent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo atualizado com sucesso",
      });
      
      setEditingContent(null);
      resetForm();
      fetchContents();
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar conteúdo",
        variant: "destructive",
      });
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este conteúdo?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo excluído com sucesso",
      });
      
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir conteúdo",
        variant: "destructive",
      });
    }
  };

  const toggleContentStatus = async (content: Content) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ is_active: !content.is_active })
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Conteúdo ${!content.is_active ? 'ativado' : 'desativado'} com sucesso`,
      });
      
      fetchContents();
    } catch (error) {
      console.error('Error toggling content status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do conteúdo",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (content: Content) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      description: content.description || "",
      content_type: content.content_type,
      video_url: content.video_url || "",
      required_plan: content.required_plan,
      is_active: content.is_active,
      order_index: content.order_index,
      carousel_image_url: content.carousel_image_url || "",
      carousel_order: content.carousel_order || 0,
      show_in_carousel: content.show_in_carousel || false
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content_type: "product",
      video_url: "",
      required_plan: "free",
      is_active: true,
      order_index: 0,
      carousel_image_url: "",
      carousel_order: 0,
      show_in_carousel: false
    });
    setEditingContent(null);
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
      case 'product': return <Video className="w-4 h-4" />;
      case 'tool': return <FileText className="w-4 h-4" />;
      case 'course': return <Video className="w-4 h-4" />;
      case 'tutorial': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Conteúdo</h2>
          <p className="text-muted-foreground">
            Gerencie produtos, ferramentas, cursos e tutoriais da plataforma
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Conteúdos ({contents.length})</CardTitle>
          <CardDescription>
            Lista de todos os conteúdos da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((content) => (
                <TableRow key={content.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{content.title}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {content.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(content.content_type)}
                      <span className="capitalize">{content.content_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadgeColor(content.required_plan)}>
                      {content.required_plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={content.is_active}
                      onCheckedChange={() => toggleContentStatus(content)}
                    />
                  </TableCell>
                  <TableCell>
                    {content.order_index}
                  </TableCell>
                  <TableCell>
                    {new Date(content.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(content)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteContent(content.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingContent} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingContent(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? 'Editar Conteúdo' : 'Criar Novo Conteúdo'}
            </DialogTitle>
            <DialogDescription>
              {editingContent ? 'Atualize as informações do conteúdo' : 'Configure um novo conteúdo para a plataforma'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Digite o título..."
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Digite a descrição..."
              />
            </div>
            
            <div>
              <Label htmlFor="content_type">Tipo de Conteúdo</Label>
              <Select 
                value={formData.content_type} 
                onValueChange={(value: 'product' | 'tool' | 'course' | 'tutorial') => setFormData({...formData, content_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="video_url">URL do Vídeo</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
            
            <div>
              <Label htmlFor="required_plan">Plano Necessário</Label>
              <Select 
                value={formData.required_plan} 
                onValueChange={(value: 'free' | 'vip' | 'pro') => setFormData({...formData, required_plan: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order_index">Ordem de Exibição</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="carousel_image_url">URL da Imagem do Carrossel (1920x1080)</Label>
              <Input
                id="carousel_image_url"
                value={formData.carousel_image_url}
                onChange={(e) => setFormData({...formData, carousel_image_url: e.target.value})}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>

            <div>
              <Label htmlFor="carousel_order">Ordem no Carrossel</Label>
              <Input
                id="carousel_order"
                type="number"
                value={formData.carousel_order}
                onChange={(e) => setFormData({...formData, carousel_order: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show_in_carousel"
                checked={formData.show_in_carousel}
                onCheckedChange={(checked) => setFormData({...formData, show_in_carousel: checked})}
              />
              <Label htmlFor="show_in_carousel">Exibir no Carrossel</Label>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={editingContent ? updateContent : createContent} 
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingContent ? 'Atualizar' : 'Criar'} Conteúdo
              </Button>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingContent(null);
                resetForm();
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
