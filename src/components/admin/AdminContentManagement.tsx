
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Video, FileText, BookOpen, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminContentDialog } from "./AdminContentDialog";

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

export const AdminContentManagement = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<'course' | 'tool' | 'tutorial' | 'product'>('product');
  const [editingContent, setEditingContent] = useState<Content | null>(null);
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

  const openCreateDialog = (contentType: 'course' | 'tool' | 'tutorial' | 'product') => {
    setSelectedContentType(contentType);
    setEditingContent(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (content: Content) => {
    setEditingContent(content);
    setSelectedContentType(content.content_type);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingContent(null);
    fetchContents(); // Atualizar a lista após fechar o diálogo
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
      case 'tool': return <Wrench className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'tutorial': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'product': return 'Produto';
      case 'tool': return 'Ferramenta';
      case 'course': return 'Curso';
      case 'tutorial': return 'Tutorial';
      default: return type;
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
        <div className="flex gap-2">
          <Button onClick={() => openCreateDialog('course')} variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Novo Curso
          </Button>
          <Button onClick={() => openCreateDialog('tool')} variant="outline">
            <Wrench className="w-4 h-4 mr-2" />
            Nova Ferramenta
          </Button>
          <Button onClick={() => openCreateDialog('tutorial')} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Novo Tutorial
          </Button>
          <Button onClick={() => openCreateDialog('product')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
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
                      <span className="capitalize">{getContentTypeLabel(content.content_type)}</span>
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

      {/* Usar o AdminContentDialog corrigido */}
      <AdminContentDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        contentItem={editingContent}
        contentType={selectedContentType}
      />
    </div>
  );
};
