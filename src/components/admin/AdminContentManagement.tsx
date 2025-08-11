import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Eye, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  required_plan: 'free' | 'vip' | 'pro';
  video_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const AdminContentManagement = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content_type: "product" as const,
    required_plan: "free" as const,
    video_url: "",
    is_active: true,
    order_index: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
    
    // Set up real-time subscription
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
    if (!selectedContent) return;

    try {
      const { error } = await supabase
        .from('content')
        .update(formData)
        .eq('id', selectedContent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo atualizado com sucesso",
      });
      
      setIsEditDialogOpen(false);
      setSelectedContent(null);
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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content_type: "product",
      required_plan: "free",
      video_url: "",
      is_active: true,
      order_index: 0,
    });
  };

  const openEditDialog = (content: Content) => {
    setSelectedContent(content);
    setFormData({
      title: content.title,
      description: content.description || "",
      content_type: content.content_type,
      required_plan: content.required_plan,
      video_url: content.video_url || "",
      is_active: content.is_active,
      order_index: content.order_index,
    });
    setIsEditDialogOpen(true);
  };

  const filteredContents = contents.filter(content => {
    const matchesSearch = !searchTerm || 
      content.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || content.content_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'product': return 'bg-blue-100 text-blue-800';
      case 'tool': return 'bg-green-100 text-green-800';
      case 'course': return 'bg-purple-100 text-purple-800';
      case 'tutorial': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Conteúdo</h2>
          <p className="text-muted-foreground">
            Gerencie produtos, ferramentas, cursos e tutoriais
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="product">Produtos</SelectItem>
                <SelectItem value="tool">Ferramentas</SelectItem>
                <SelectItem value="course">Cursos</SelectItem>
                <SelectItem value="tutorial">Tutoriais</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Conteúdos ({filteredContents.length})</CardTitle>
          <CardDescription>
            Lista completa de conteúdos com detalhes e ações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plano Necessário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContents.map((content) => (
                <TableRow key={content.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{content.title}</div>
                      {content.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {content.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(content.content_type)}>
                      {content.content_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadgeColor(content.required_plan)}>
                      {content.required_plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={content.is_active ? "default" : "secondary"}>
                      {content.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{content.order_index}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Conteúdo</DialogTitle>
            <DialogDescription>
              Adicione um novo conteúdo à plataforma
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
              <Label htmlFor="type">Tipo de Conteúdo</Label>
              <Select 
                value={formData.content_type} 
                onValueChange={(value: any) => setFormData({...formData, content_type: value})}
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
              <Label htmlFor="plan">Plano Necessário</Label>
              <Select 
                value={formData.required_plan} 
                onValueChange={(value: any) => setFormData({...formData, required_plan: value})}
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
              <Label htmlFor="video_url">URL do Vídeo</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                placeholder="YouTube, Google Drive, etc..."
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
            
            <div>
              <Label htmlFor="order_index">Ordem (índice)</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={createContent} className="flex-1">
                Criar Conteúdo
              </Button>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conteúdo</DialogTitle>
            <DialogDescription>
              Modifique as informações do conteúdo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Digite o título..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Digite a descrição..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit-type">Tipo de Conteúdo</Label>
              <Select 
                value={formData.content_type} 
                onValueChange={(value: any) => setFormData({...formData, content_type: value})}
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
              <Label htmlFor="edit-plan">Plano Necessário</Label>
              <Select 
                value={formData.required_plan} 
                onValueChange={(value: any) => setFormData({...formData, required_plan: value})}
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
              <Label htmlFor="edit-video_url">URL do Vídeo</Label>
              <Input
                id="edit-video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                placeholder="YouTube, Google Drive, etc..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="edit-is_active">Ativo</Label>
            </div>
            
            <div>
              <Label htmlFor="edit-order_index">Ordem (índice)</Label>
              <Input
                id="edit-order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={updateContent} className="flex-1">
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};