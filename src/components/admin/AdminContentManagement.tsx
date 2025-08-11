
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Eye, EyeOff, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminContentDialog } from "./AdminContentDialog";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  required_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
  status: string;
  video_url: string | null;
  hero_image_url: string | null;
  created_at: string;
  updated_at: string;
  order_index: number;
  show_in_carousel: boolean;
  carousel_order: number;
  carousel_image_url?: string;
}

interface AdminContentManagementProps {
  onEditTopics?: (contentId: string) => void;
}

export const AdminContentManagement = ({ onEditTopics }: AdminContentManagementProps) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      console.log('Fetching all contents...');
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Contents fetched:', data?.length || 0);
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

  const toggleContentStatus = async (content: Content) => {
    try {
      const newStatus = !content.is_active;
      console.log('Toggling content status for:', content.title, 'to:', newStatus);
      
      const { error } = await supabase
        .from('content')
        .update({ is_active: newStatus })
        .eq('id', content.id);

      if (error) throw error;

      setContents(prevContents => 
        prevContents.map(c => 
          c.id === content.id 
            ? { ...c, is_active: newStatus }
            : c
        )
      );

      toast({
        title: "Sucesso",
        description: `Conteúdo ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
      });
    } catch (error) {
      console.error('Error toggling content status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do conteúdo",
        variant: "destructive",
      });
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      console.log('Deleting content:', id);
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo excluído com sucesso",
      });
      
      await fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir conteúdo",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingContent(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (content: Content) => {
    setEditingContent(content);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingContent(null);
    fetchContents();
  };

  const handleEditTopicsClick = (contentId: string) => {
    if (onEditTopics) {
      onEditTopics(contentId);
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

  const getStatusBadge = (content: Content) => {
    if (!content.is_active) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    
    switch (content.status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Publicado</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Agendado</Badge>;
      default:
        return <Badge variant="outline">{content.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando conteúdos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Conteúdo</h2>
          <p className="text-muted-foreground">
            Gerencie todos os conteúdos da plataforma
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Lista de Conteúdos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os conteúdos criados
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
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((content) => (
                <TableRow key={content.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{content.title}</div>
                    {content.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {content.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{content.content_type}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadgeColor(content.required_plan)}>
                      {content.required_plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(content)}
                  </TableCell>
                  <TableCell>
                    {new Date(content.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTopicsClick(content.id)}
                        title="Editar tópicos"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleContentStatus(content)}
                        title={content.is_active ? "Desativar conteúdo" : "Ativar conteúdo"}
                      >
                        {content.is_active ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-red-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(content)}
                        title="Editar conteúdo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteContent(content.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Excluir conteúdo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {contents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum conteúdo encontrado</p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Conteúdo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminContentDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        content={editingContent}
        onContentSaved={handleDialogClose}
      />
    </div>
  );
};
